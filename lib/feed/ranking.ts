import type { FeedItem } from "@/components/feed/ReelsFeed"
import type { InvestorInterestRecord, InvestorRecord, ProductRecord } from "@/lib/db/types"

type RankFeedItemsInput = {
    items: FeedItem[]
    viewerInvestor: InvestorRecord | null
    allInterests: InvestorInterestRecord[]
    productsById: Map<string, ProductRecord>
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

const normalizeStage = (value: string | null | undefined): string => {
    if (!value) return ""
    return value.trim().toUpperCase().replace(/[\s-]+/g, "_")
}

const normalizeText = (value: string): string =>
    value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ")

const tokenize = (value: string | null | undefined): string[] => {
    if (!value) return []
    return normalizeText(value)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
}

const addWeighted = (map: Map<string, number>, key: string, weight: number): void => {
    map.set(key, (map.get(key) || 0) + weight)
}

const hashToUnit = (value: string): number => {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0
    }
    return (Math.abs(hash) % 10_000) / 10_000
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const uniquePositiveInvestorCountByProduct = (
    allInterests: InvestorInterestRecord[]
): Map<string, number> => {
    const byProduct = new Map<string, Set<string>>()

    for (const interest of allInterests) {
        if (!interest.productId) continue
        if (interest.interestType !== "LIKED" && interest.interestType !== "COMMITTED") continue

        const investorSet = byProduct.get(interest.productId) || new Set<string>()
        investorSet.add(interest.investorId)
        byProduct.set(interest.productId, investorSet)
    }

    const counts = new Map<string, number>()
    byProduct.forEach((investorSet, productId) => {
        counts.set(productId, investorSet.size)
    })
    return counts
}

export function rankFeedItems(input: RankFeedItemsInput): FeedItem[] {
    const { items, viewerInvestor, allInterests, productsById } = input
    if (items.length <= 1 || !viewerInvestor) {
        return items
    }

    const viewerInterests = allInterests.filter((interest) =>
        interest.investorId === viewerInvestor.id &&
        Boolean(interest.productId) &&
        (interest.interestType === "LIKED" || interest.interestType === "COMMITTED")
    )
    const hasPersonalHistory = viewerInterests.length > 0

    const stageAffinity = new Map<string, number>()
    const tokenAffinity = new Map<string, number>()
    const alreadyLikedProductIds = new Set<string>()

    const positiveWeightForType = (interestType: InvestorInterestRecord["interestType"]): number =>
        interestType === "COMMITTED" ? 2 : 1

    for (const interest of viewerInterests) {
        const productId = interest.productId
        if (!productId) continue
        alreadyLikedProductIds.add(productId)

        const product = productsById.get(productId)
        if (!product) continue

        const interactionWeight = positiveWeightForType(interest.interestType)
        const stageKey = normalizeStage(product.stage)
        if (stageKey) {
            addWeighted(stageAffinity, stageKey, interactionWeight)
        }

        for (const token of tokenize(product.name)) {
            addWeighted(tokenAffinity, token, interactionWeight * 2)
        }
        for (const token of tokenize(product.tagline)) {
            addWeighted(tokenAffinity, token, interactionWeight * 1.5)
        }
        for (const token of tokenize(product.description || "")) {
            addWeighted(tokenAffinity, token, interactionWeight)
        }
        for (const token of tokenize(product.problem || "")) {
            addWeighted(tokenAffinity, token, interactionWeight * 0.8)
        }
        for (const token of tokenize(product.solution || "")) {
            addWeighted(tokenAffinity, token, interactionWeight * 0.8)
        }
    }

    for (const tag of viewerInvestor.interestTags || []) {
        for (const token of tokenize(tag.name)) {
            addWeighted(tokenAffinity, token, 1.25)
        }
    }

    const stagePreference = normalizeStage(viewerInvestor.investmentStagePreference || "")
    if (stagePreference && !stageAffinity.has(stagePreference)) {
        addWeighted(stageAffinity, stagePreference, 1.5)
    }

    const popularityByProduct = uniquePositiveInvestorCountByProduct(allInterests)
    const maxPopularity = Math.max(
        1,
        ...Array.from(popularityByProduct.values())
    )
    const maxStageAffinity = Math.max(1, ...Array.from(stageAffinity.values()))
    const maxTokenAffinity = Math.max(1, ...Array.from(tokenAffinity.values()))
    const dailySalt = new Date().toISOString().slice(0, 10)

    const scored = items.map((item, index) => {
        const stageKey = normalizeStage(item.stage)
        const stageScore = stageKey
            ? clamp01((stageAffinity.get(stageKey) || 0) / maxStageAffinity)
            : 0

        const itemTokens = new Set<string>([
            ...tokenize(item.name),
            ...tokenize(item.tagline),
            ...tokenize(item.description || ""),
        ])
        let tokenTotal = 0
        itemTokens.forEach((token) => {
            tokenTotal += tokenAffinity.get(token) || 0
        })
        const textScore = clamp01(tokenTotal / (maxTokenAffinity * 6))

        const popularityScore = clamp01((popularityByProduct.get(item.productId) || 0) / maxPopularity)

        const product = productsById.get(item.productId)
        const ageMs = product?.createdAt ? (Date.now() - Date.parse(product.createdAt)) : Number.NaN
        const ageDays = Number.isFinite(ageMs) ? ageMs / (1000 * 60 * 60 * 24) : 365
        const freshnessScore = clamp01(Math.exp(-Math.max(ageDays, 0) / 45))

        const explorationScore = hashToUnit(
            `${viewerInvestor.id}:${item.productId}:${dailySalt}:${index}`
        )

        // Slightly reduce repeats for already-liked products without fully removing them.
        const likedPenalty = alreadyLikedProductIds.has(item.productId) ? 0.12 : 0

        const score = hasPersonalHistory
            ? (
                stageScore * 0.32 +
                textScore * 0.30 +
                popularityScore * 0.18 +
                freshnessScore * 0.12 +
                explorationScore * 0.08 -
                likedPenalty
            )
            : (
                stageScore * 0.40 +
                popularityScore * 0.30 +
                freshnessScore * 0.18 +
                explorationScore * 0.12
            )

        return { item, score }
    })

    scored.sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        return left.item.id.localeCompare(right.item.id)
    })

    return scored.map((entry) => entry.item)
}
