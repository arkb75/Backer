'use client'

import type { FeedEventType } from "@/lib/db/types"

type TrackFeedEventInput = {
    productId: string
    eventType: FeedEventType
    watchMs?: number
    durationMs?: number
    metadata?: Record<string, string | number | boolean | null>
}

type TrackFeedEventOptions = {
    dedupeKey?: string
    dedupeWindowMs?: number
}

const lastSentByKey = new Map<string, number>()

export function trackFeedEvent(
    input: TrackFeedEventInput,
    options: TrackFeedEventOptions = {}
): void {
    if (typeof window === "undefined") return
    if (!input.productId || !input.eventType) return

    const now = Date.now()
    const dedupeKey = options.dedupeKey || `${input.productId}:${input.eventType}`
    const dedupeWindowMs = options.dedupeWindowMs ?? 2000
    const lastSent = lastSentByKey.get(dedupeKey) || 0
    if (now - lastSent < dedupeWindowMs) {
        return
    }

    lastSentByKey.set(dedupeKey, now)

    void fetch("/api/feed/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        keepalive: true,
    }).catch(() => {
        // Best-effort analytics.
    })
}
