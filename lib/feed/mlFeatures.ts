import type { FeedItem } from "@/components/feed/ReelsFeed"
import type { InvestorInterestRecord, InvestorRecord, ProductRecord } from "@/lib/db/types"

export const FEED_MODEL_FEATURE_NAMES = [
    "bias",
    "stage_match",
    "stage_affinity",
    "text_affinity",
    "tag_overlap",
    "popularity",
    "freshness",
] as const

export type FeedMlCandidate = {
    productId: string
    name: string
    tagline: string
    description: string | null
    stage: string | null
    createdAt: string | null
}

export type InvestorPositiveSignal = {
    productId: string
    weight: number
}

type InvestorAffinityContext = {
    stageAffinity: Map<string, number>
    tokenAffinity: Map<string, number>
    maxStageAffinity: number
    maxTokenAffinity: number
    stagePreference: string
    interestTagTokens: Set<string>
    positiveProductIds: Set<string>
}

type ProductPopularityContext = {
    byProduct: Map<string, number>
    maxPopularity: number
}

const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "we",
    "with",
    "you",
])

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const normalizeText = (value: string): string =>
    value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ")

export const normalizeStage = (value: string | null | undefined): string => {
    if (!value) return ""
    return value.trim().toUpperCase().replace(/[\s-]+/g, "_")
}

export const tokenize = (value: string | null | undefined): string[] => {
    if (!value) return []
    return normalizeText(value)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
}

const addWeighted = (map: Map<string, number>, key: string, weight: number): void => {
    map.set(key, (map.get(key) || 0) + weight)
}

const positiveInterestWeight = (interest: InvestorInterestRecord): number | null => {
    if (interest.interestType === "COMMITTED") return 2
    if (interest.interestType === "LIKED") return 1
    return null
}

export function buildInvestorPositiveSignals(input: {
    investorId: string
    allInterests: InvestorInterestRecord[]
}): InvestorPositiveSignal[] {
    return input.allInterests
        .filter((interest) => interest.investorId === input.investorId)
        .flatMap((interest) => {
            const productId = interest.productId
            const weight = positiveInterestWeight(interest)
            if (!productId || weight === null) return []
            return [{ productId, weight }]
        })
}

export function buildProductPopularityContext(
    allInterests: InvestorInterestRecord[]
): ProductPopularityContext {
    const byProduct = new Map<string, Set<string>>()

    for (const interest of allInterests) {
        if (!interest.productId) continue
        if (!positiveInterestWeight(interest)) continue

        const investorSet = byProduct.get(interest.productId) || new Set<string>()
        investorSet.add(interest.investorId)
        byProduct.set(interest.productId, investorSet)
    }

    const counts = new Map<string, number>()
    byProduct.forEach((investors, productId) => {
        counts.set(productId, investors.size)
    })

    const maxPopularity = Math.max(1, ...Array.from(counts.values()))
    return { byProduct: counts, maxPopularity }
}

export function buildInvestorAffinityContext(input: {
    investor: InvestorRecord
    positiveSignals: InvestorPositiveSignal[]
    productsById: Map<string, ProductRecord>
}): InvestorAffinityContext {
    const stageAffinity = new Map<string, number>()
    const tokenAffinity = new Map<string, number>()
    const positiveProductIds = new Set<string>()

    for (const signal of input.positiveSignals) {
        const product = input.productsById.get(signal.productId)
        if (!product) continue
        positiveProductIds.add(signal.productId)

        const stageKey = normalizeStage(product.stage)
        if (stageKey) {
            addWeighted(stageAffinity, stageKey, signal.weight)
        }

        for (const token of tokenize(product.name)) {
            addWeighted(tokenAffinity, token, signal.weight * 2)
        }
        for (const token of tokenize(product.tagline)) {
            addWeighted(tokenAffinity, token, signal.weight * 1.5)
        }
        for (const token of tokenize(product.description || "")) {
            addWeighted(tokenAffinity, token, signal.weight)
        }
        for (const token of tokenize(product.problem || "")) {
            addWeighted(tokenAffinity, token, signal.weight * 0.8)
        }
        for (const token of tokenize(product.solution || "")) {
            addWeighted(tokenAffinity, token, signal.weight * 0.8)
        }
    }

    const interestTagTokens = new Set<string>()
    for (const tag of input.investor.interestTags || []) {
        for (const token of tokenize(tag.name)) {
            interestTagTokens.add(token)
            addWeighted(tokenAffinity, token, 1.25)
        }
    }

    const stagePreference = normalizeStage(input.investor.investmentStagePreference || "")
    if (stagePreference && !stageAffinity.has(stagePreference)) {
        addWeighted(stageAffinity, stagePreference, 1.5)
    }

    const maxStageAffinity = Math.max(1, ...Array.from(stageAffinity.values()))
    const maxTokenAffinity = Math.max(1, ...Array.from(tokenAffinity.values()))

    return {
        stageAffinity,
        tokenAffinity,
        maxStageAffinity,
        maxTokenAffinity,
        stagePreference,
        interestTagTokens,
        positiveProductIds,
    }
}

export function toFeedMlCandidate(input: {
    item: FeedItem
    product?: ProductRecord | null
}): FeedMlCandidate {
    return {
        productId: input.item.productId,
        name: input.item.name,
        tagline: input.item.tagline,
        description: input.item.description,
        stage: input.item.stage,
        createdAt: input.product?.createdAt || null,
    }
}

export function toProductCandidate(product: ProductRecord): FeedMlCandidate {
    return {
        productId: product.id,
        name: product.name,
        tagline: product.tagline,
        description: product.description || null,
        stage: product.stage || null,
        createdAt: product.createdAt || null,
    }
}

export function buildFeedFeatureVector(input: {
    candidate: FeedMlCandidate
    investorContext: InvestorAffinityContext
    popularityContext: ProductPopularityContext
}): number[] {
    const { candidate, investorContext, popularityContext } = input
    const stageKey = normalizeStage(candidate.stage)

    const stageMatch = stageKey && investorContext.stagePreference
        ? Number(stageKey === investorContext.stagePreference)
        : 0
    const stageAffinityScore = stageKey
        ? clamp01((investorContext.stageAffinity.get(stageKey) || 0) / investorContext.maxStageAffinity)
        : 0

    const candidateTokens = new Set<string>([
        ...tokenize(candidate.name),
        ...tokenize(candidate.tagline),
        ...tokenize(candidate.description || ""),
    ])

    let tokenAffinityTotal = 0
    let tagOverlapCount = 0
    candidateTokens.forEach((token) => {
        tokenAffinityTotal += investorContext.tokenAffinity.get(token) || 0
        if (investorContext.interestTagTokens.has(token)) {
            tagOverlapCount += 1
        }
    })

    const tokenCount = Math.max(1, candidateTokens.size)
    const textAffinityScore = clamp01(
        tokenAffinityTotal / (investorContext.maxTokenAffinity * tokenCount * 1.25)
    )
    const tagOverlapScore = clamp01(tagOverlapCount / tokenCount)

    const popularityScore = clamp01(
        (popularityContext.byProduct.get(candidate.productId) || 0) / popularityContext.maxPopularity
    )

    const createdAtMs = candidate.createdAt ? Date.parse(candidate.createdAt) : Number.NaN
    const ageDays = Number.isFinite(createdAtMs)
        ? Math.max(0, (Date.now() - createdAtMs) / (1000 * 60 * 60 * 24))
        : 365
    const freshnessScore = clamp01(Math.exp(-ageDays / 45))

    return [
        1,
        stageMatch,
        stageAffinityScore,
        textAffinityScore,
        tagOverlapScore,
        popularityScore,
        freshnessScore,
    ]
}

export function dot(weights: number[], features: number[]): number {
    const size = Math.min(weights.length, features.length)
    let value = 0
    for (let i = 0; i < size; i += 1) {
        value += weights[i] * features[i]
    }
    return value
}

export function sigmoid(value: number): number {
    if (value > 40) return 1
    if (value < -40) return 0
    return 1 / (1 + Math.exp(-value))
}

export function hashToUnit(value: string): number {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0
    }
    return (Math.abs(hash) % 10_000) / 10_000
}

export function applySeenPenalty(score: number, hasSeen: boolean): number {
    if (!hasSeen) return score
    return score - 0.08
}
