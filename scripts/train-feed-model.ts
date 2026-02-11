import "dotenv/config"
import fs from "node:fs"
import path from "node:path"
import {
    listFeedEvents,
    listInvestorInterests,
    listInvestors,
    listProducts,
} from "@/lib/db/repository"
import {
    FEED_MODEL_FEATURE_NAMES,
    buildFeedFeatureVector,
    buildInvestorAffinityContext,
    buildInvestorPositiveSignals,
    buildProductPopularityContext,
    dot,
    hashToUnit,
    sigmoid,
    toProductCandidate,
} from "@/lib/feed/mlFeatures"
import type { InvestorPositiveSignal } from "@/lib/feed/mlFeatures"

type LabeledExample = {
    key: string
    features: number[]
    label: 0 | 1
}

type TrainConfig = {
    epochs: number
    learningRate: number
    l2: number
}

const isResourceNotFound = (error: unknown): boolean => {
    const name = (error as { name?: string })?.name
    const type = (error as { __type?: string })?.__type
    return name === "ResourceNotFoundException" || type?.includes("ResourceNotFoundException") === true
}

const DEFAULT_CONFIG: TrainConfig = {
    epochs: 320,
    learningRate: 0.28,
    l2: 0.0015,
}

const resolveModelPath = (): string => {
    const configured = process.env.FEED_MODEL_PATH?.trim()
    if (!configured) {
        return path.join(process.cwd(), "lib/feed/model/feed-model.json")
    }
    return path.isAbsolute(configured)
        ? configured
        : path.join(process.cwd(), configured)
}

const dedupePositiveSignals = (signals: InvestorPositiveSignal[]): InvestorPositiveSignal[] => {
    const byProduct = new Map<string, number>()
    for (const signal of signals) {
        const current = byProduct.get(signal.productId) || 0
        byProduct.set(signal.productId, Math.max(current, signal.weight))
    }
    return Array.from(byProduct.entries()).map(([productId, weight]) => ({
        productId,
        weight,
    }))
}

const FEED_EVENT_SIGNAL_WEIGHT: Record<string, number> = {
    LIKE: 1,
    COMMIT: 2,
    PRODUCT_OPEN: 0.65,
    MESSAGE_CLICK: 1.2,
    WATCH_50: 0.35,
    WATCH_COMPLETE: 0.8,
    WATCH_2S: 0.1,
}

const eventSignalsByInvestor = (events: Array<{
    investorId: string
    productId: string
    eventType: string
}>): Map<string, InvestorPositiveSignal[]> => {
    const perInvestor = new Map<string, Map<string, number>>()

    for (const event of events) {
        const weight = FEED_EVENT_SIGNAL_WEIGHT[event.eventType]
        if (!weight) continue

        const investorSignals = perInvestor.get(event.investorId) || new Map<string, number>()
        investorSignals.set(
            event.productId,
            (investorSignals.get(event.productId) || 0) + weight
        )
        perInvestor.set(event.investorId, investorSignals)
    }

    const result = new Map<string, InvestorPositiveSignal[]>()
    perInvestor.forEach((signalMap, investorId) => {
        result.set(
            investorId,
            Array.from(signalMap.entries()).map(([productId, weight]) => ({
                productId,
                weight,
            }))
        )
    })
    return result
}

const sampleDeterministic = (ids: string[], count: number, seed: string): string[] => {
    return [...ids]
        .map((id) => ({
            id,
            score: hashToUnit(`${seed}:${id}`),
        }))
        .sort((a, b) => a.score - b.score)
        .slice(0, count)
        .map((entry) => entry.id)
}

const splitExamples = (examples: LabeledExample[]): { train: LabeledExample[]; test: LabeledExample[] } => {
    const train: LabeledExample[] = []
    const test: LabeledExample[] = []

    for (const example of examples) {
        const isTrain = hashToUnit(`split:${example.key}`) < 0.8
        if (isTrain) {
            train.push(example)
        } else {
            test.push(example)
        }
    }

    if (test.length === 0 && train.length > 1) {
        const moved = train.splice(Math.floor(train.length * 0.8))
        test.push(...moved)
    }

    return { train, test }
}

const trainLogisticRegression = (
    examples: LabeledExample[],
    featureCount: number,
    config: TrainConfig
): number[] => {
    const weights = Array.from({ length: featureCount }, () => 0)
    if (examples.length === 0) return weights

    const positiveCount = examples.filter((example) => example.label === 1).length
    const negativeCount = Math.max(1, examples.length - positiveCount)
    const positiveWeight = positiveCount > 0 ? examples.length / (2 * positiveCount) : 1
    const negativeWeight = examples.length / (2 * negativeCount)

    for (let epoch = 0; epoch < config.epochs; epoch += 1) {
        const gradients = Array.from({ length: featureCount }, () => 0)

        for (const example of examples) {
            const prediction = sigmoid(dot(weights, example.features))
            const error = prediction - example.label
            const sampleWeight = example.label === 1 ? positiveWeight : negativeWeight

            for (let j = 0; j < featureCount; j += 1) {
                gradients[j] += error * example.features[j] * sampleWeight
            }
        }

        for (let j = 0; j < featureCount; j += 1) {
            const gradient = gradients[j] / examples.length + config.l2 * weights[j]
            weights[j] -= config.learningRate * gradient
        }
    }

    return weights
}

const evaluate = (examples: LabeledExample[], weights: number[]) => {
    if (examples.length === 0) {
        return {
            accuracy: 0,
            logLoss: 0,
            auc: 0,
            positiveRate: 0,
        }
    }

    const withPred = examples.map((example) => {
        const probability = sigmoid(dot(weights, example.features))
        return {
            label: example.label,
            probability,
        }
    })

    let correct = 0
    let totalLoss = 0
    for (const row of withPred) {
        const prediction = row.probability >= 0.5 ? 1 : 0
        if (prediction === row.label) {
            correct += 1
        }
        const clipped = Math.min(Math.max(row.probability, 1e-9), 1 - 1e-9)
        totalLoss += -(
            row.label * Math.log(clipped) +
            (1 - row.label) * Math.log(1 - clipped)
        )
    }

    const sorted = [...withPred].sort((a, b) => a.probability - b.probability)
    let positive = 0
    let negative = 0
    let rank = 1
    let positiveRankSum = 0
    for (const row of sorted) {
        if (row.label === 1) {
            positive += 1
            positiveRankSum += rank
        } else {
            negative += 1
        }
        rank += 1
    }

    const auc = positive > 0 && negative > 0
        ? (positiveRankSum - (positive * (positive + 1)) / 2) / (positive * negative)
        : 0.5

    return {
        accuracy: correct / examples.length,
        logLoss: totalLoss / examples.length,
        auc,
        positiveRate: positive / examples.length,
    }
}

async function main() {
    console.log("[feed-ml] Loading investors/products/interests from DynamoDB...")

    const [investors, products, interests, feedEvents] = await Promise.all([
        listInvestors(),
        listProducts(),
        listInvestorInterests(),
        listFeedEvents().catch((error) => {
            if (isResourceNotFound(error)) {
                console.warn("[feed-ml] Feed events table not found yet; training without event signals.")
                return []
            }
            throw error
        }),
    ])

    const feedProducts = products.filter((product) => Boolean(product.videoUrl))
    const productsById = new Map(feedProducts.map((product) => [product.id, product]))
    const productIds = feedProducts.map((product) => product.id)

    if (feedProducts.length < 2) {
        throw new Error("Need at least 2 products with videos to train the feed model.")
    }

    const popularityContext = buildProductPopularityContext(interests)
    const eventSignalsLookup = eventSignalsByInvestor(feedEvents)
    const examples: LabeledExample[] = []

    for (const investor of investors) {
        const interestSignals = buildInvestorPositiveSignals({
            investorId: investor.id,
            allInterests: interests,
        })
        const eventSignals = eventSignalsLookup.get(investor.id) || []
        const signals = dedupePositiveSignals(
            [...interestSignals, ...eventSignals]
                .filter((signal) => productsById.has(signal.productId))
        ).filter((signal) => signal.weight >= 0.75)
        if (signals.length === 0) continue

        const positiveProductIds = signals.map((signal) => signal.productId)
        const negativePool = productIds.filter((productId) => !positiveProductIds.includes(productId))
        const negativeCount = Math.min(
            Math.max(positiveProductIds.length * 2, 4),
            negativePool.length
        )
        const negativeIds = sampleDeterministic(
            negativePool,
            negativeCount,
            `${investor.id}:negative-sample`
        )

        for (const positiveProductId of positiveProductIds) {
            const holdoutSignals = signals.filter((signal) => signal.productId !== positiveProductId)
            const contextSignals = holdoutSignals.length > 0 ? holdoutSignals : signals
            const investorContext = buildInvestorAffinityContext({
                investor,
                positiveSignals: contextSignals,
                productsById,
            })

            const candidateProduct = productsById.get(positiveProductId)
            if (!candidateProduct) continue

            examples.push({
                key: `${investor.id}:${positiveProductId}:1`,
                label: 1,
                features: buildFeedFeatureVector({
                    candidate: toProductCandidate(candidateProduct),
                    investorContext,
                    popularityContext,
                }),
            })
        }

        if (negativeIds.length > 0) {
            const investorContext = buildInvestorAffinityContext({
                investor,
                positiveSignals: signals,
                productsById,
            })

            for (const negativeId of negativeIds) {
                const candidateProduct = productsById.get(negativeId)
                if (!candidateProduct) continue

                examples.push({
                    key: `${investor.id}:${negativeId}:0`,
                    label: 0,
                    features: buildFeedFeatureVector({
                        candidate: toProductCandidate(candidateProduct),
                        investorContext,
                        popularityContext,
                    }),
                })
            }
        }
    }

    if (examples.length < 12) {
        throw new Error(
            `Not enough training examples (${examples.length}). Need at least 12 labeled examples.`
        )
    }

    const { train, test } = splitExamples(examples)
    const weights = trainLogisticRegression(
        train,
        FEED_MODEL_FEATURE_NAMES.length,
        DEFAULT_CONFIG
    )

    const trainMetrics = evaluate(train, weights)
    const testMetrics = evaluate(test, weights)

    const model = {
        version: 1,
        trainedAt: new Date().toISOString(),
        featureNames: [...FEED_MODEL_FEATURE_NAMES],
        weights,
        metrics: {
            train: trainMetrics,
            test: testMetrics,
            samples: examples.length,
        },
        dataSummary: {
            investors: investors.length,
            products: feedProducts.length,
            interests: interests.length,
            feedEvents: feedEvents.length,
            trainSamples: train.length,
            testSamples: test.length,
        },
        trainingConfig: DEFAULT_CONFIG,
    }

    const modelPath = resolveModelPath()
    fs.mkdirSync(path.dirname(modelPath), { recursive: true })
    fs.writeFileSync(modelPath, `${JSON.stringify(model, null, 2)}\n`, "utf8")

    console.log(`[feed-ml] Model saved to ${modelPath}`)
    console.log("[feed-ml] Train metrics:", trainMetrics)
    console.log("[feed-ml] Test metrics:", testMetrics)
    console.log("[feed-ml] Weights:", weights)
}

main().catch((error) => {
    console.error("[feed-ml] Training failed")
    console.error(error)
    process.exit(1)
})
