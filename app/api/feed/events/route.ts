import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import {
    createFeedEvent,
    getInvestorByUserId,
    getProductById,
} from "@/lib/db/repository"
import type { FeedEventType } from "@/lib/db/types"

const FEED_EVENT_TYPES: FeedEventType[] = [
    "IMPRESSION",
    "WATCH_2S",
    "WATCH_50",
    "WATCH_COMPLETE",
    "PRODUCT_OPEN",
    "LIKE",
    "UNLIKE",
    "MESSAGE_CLICK",
    "COMMIT",
]

const FEED_EVENT_TYPE_SET = new Set<FeedEventType>(FEED_EVENT_TYPES)

const toFiniteNumberOrNull = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null
    return value
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id || session.user.userType !== "INVESTOR") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json().catch(() => null) as
            | {
                productId?: string
                eventType?: FeedEventType
                watchMs?: number
                durationMs?: number
                metadata?: Record<string, string | number | boolean | null>
            }
            | null

        const productId = body?.productId?.trim()
        const eventType = body?.eventType
        if (!productId || !eventType || !FEED_EVENT_TYPE_SET.has(eventType)) {
            return NextResponse.json(
                { error: "productId and valid eventType are required" },
                { status: 400 }
            )
        }

        const [investor, product] = await Promise.all([
            getInvestorByUserId(session.user.id),
            getProductById(productId),
        ])
        if (!investor) {
            return NextResponse.json({ error: "Investor profile not found" }, { status: 404 })
        }
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        await createFeedEvent({
            investorId: investor.id,
            productId,
            eventType,
            watchMs: toFiniteNumberOrNull(body?.watchMs),
            durationMs: toFiniteNumberOrNull(body?.durationMs),
            metadata: body?.metadata || null,
        })

        return NextResponse.json({ ok: true }, { status: 201 })
    } catch (error) {
        const code = (error as { name?: string })?.name
        if (code === "ResourceNotFoundException") {
            // If feed events table has not been provisioned yet, keep UX unaffected.
            return NextResponse.json({ ok: false, reason: "feed-events-table-missing" }, { status: 202 })
        }
        console.error("[FEED_EVENT_CREATE_ERROR]", error)
        return NextResponse.json({ error: "Failed to record feed event" }, { status: 500 })
    }
}
