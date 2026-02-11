import type { FeedItem } from "@/components/feed/ReelsFeed"
import type { InvestorInterestRecord, InvestorRecord, ProductRecord } from "@/lib/db/types"
import {
    applySeenPenalty,
    buildFeedFeatureVector,
    buildInvestorAffinityContext,
    buildInvestorPositiveSignals,
    buildProductPopularityContext,
    dot,
    hashToUnit,
    sigmoid,
    toFeedMlCandidate,
} from "@/lib/feed/mlFeatures"
import { loadFeedModel } from "@/lib/feed/model"

type RankFeedItemsInput = {
    items: FeedItem[]
    viewerInvestor: InvestorRecord | null
    allInterests: InvestorInterestRecord[]
    productsById: Map<string, ProductRecord>
}

const fallbackScore = (features: number[]): number => (
    features[1] * 0.22 + // stage_match
    features[2] * 0.28 + // stage_affinity
    features[3] * 0.26 + // text_affinity
    features[4] * 0.10 + // tag_overlap
    features[5] * 0.09 + // popularity
    features[6] * 0.05 // freshness
)

export function rankFeedItems(input: RankFeedItemsInput): FeedItem[] {
    const { items, viewerInvestor, allInterests, productsById } = input
    if (items.length <= 1 || !viewerInvestor) {
        return items
    }

    const positiveSignals = buildInvestorPositiveSignals({
        investorId: viewerInvestor.id,
        allInterests,
    })
    const popularityContext = buildProductPopularityContext(allInterests)
    const investorContext = buildInvestorAffinityContext({
        investor: viewerInvestor,
        positiveSignals,
        productsById,
    })
    const model = loadFeedModel()
    const dailySalt = new Date().toISOString().slice(0, 10)

    const scored = items.map((item, index) => {
        const candidate = toFeedMlCandidate({
            item,
            product: productsById.get(item.productId),
        })
        const features = buildFeedFeatureVector({
            candidate,
            investorContext,
            popularityContext,
        })

        const modelScore = model
            ? sigmoid(dot(model.weights, features))
            : fallbackScore(features)

        const seenPenaltyScore = applySeenPenalty(
            modelScore,
            investorContext.positiveProductIds.has(item.productId)
        )
        const exploration = hashToUnit(`${viewerInvestor.id}:${item.productId}:${dailySalt}:${index}`) * 0.02

        return {
            item,
            score: seenPenaltyScore + exploration,
        }
    })

    scored.sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        return left.item.id.localeCompare(right.item.id)
    })

    return scored.map((entry) => entry.item)
}
