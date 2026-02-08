import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
    deleteProductAndRelations,
    getFounderByUserId,
    getProductById,
    listFounderProductsByFounderId,
    updateProductById,
} from "@/lib/db/repository"
import type { ProductStatus } from "@/lib/db/types"

interface RouteContext {
    params: {
        id: string
    }
}

const trimString = (value: unknown): string =>
    typeof value === "string" ? value.trim() : ""

const nullableString = (value: unknown): string | null => {
    const parsed = trimString(value)
    return parsed ? parsed : null
}

const parseAskAmount = (value: unknown): { value: number | null; error?: string } => {
    if (value === undefined || value === null || value === "") {
        return { value: null }
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value) || value < 0) {
            return { value: null, error: "Ask amount must be a non-negative number" }
        }
        return { value: Math.floor(value) }
    }
    if (typeof value === "string") {
        const normalized = value.replace(/[$,\s]/g, "")
        if (!normalized) {
            return { value: null }
        }
        const parsed = Number.parseInt(normalized, 10)
        if (Number.isNaN(parsed) || parsed < 0) {
            return { value: null, error: "Ask amount must be a non-negative number" }
        }
        return { value: parsed }
    }
    return { value: null, error: "Ask amount must be a non-negative number" }
}

const parseStatus = (value: unknown): ProductStatus | null => {
    const normalized = trimString(value).toUpperCase()
    if (
        normalized === "IDEA" ||
        normalized === "BUILDING" ||
        normalized === "LAUNCHED" ||
        normalized === "RAISING" ||
        normalized === "FUNDED"
    ) {
        return normalized
    }
    return null
}

const validateFounderOwner = async (userId: string, productId: string) => {
    const founder = await getFounderByUserId(userId)
    if (!founder) {
        throw new Error("FOUNDER_NOT_FOUND")
    }

    const memberships = await listFounderProductsByFounderId(founder.id)
    const ownsProduct = memberships.some((membership) => membership.productId === productId)
    if (!ownsProduct) {
        throw new Error("FORBIDDEN")
    }

    return founder
}

export async function PUT(req: Request, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.userType !== "FOUNDER") {
            return NextResponse.json({ error: "Only founders can edit products" }, { status: 403 })
        }

        const productId = context.params.id
        const product = await getProductById(productId)
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        try {
            await validateFounderOwner(session.user.id, productId)
        } catch (error) {
            if (error instanceof Error && error.message === "FOUNDER_NOT_FOUND") {
                return NextResponse.json({ error: "Founder profile not found" }, { status: 404 })
            }
            return NextResponse.json({ error: "You can only edit your own products" }, { status: 403 })
        }

        const body = await req.json()
        const name = trimString(body?.name)
        const tagline = trimString(body?.tagline)
        if (!name || !tagline) {
            return NextResponse.json({ error: "Product name and tagline are required" }, { status: 400 })
        }

        const status = parseStatus(body?.status) || product.status
        const askAmountResult = parseAskAmount(body?.askAmount)
        if (askAmountResult.error) {
            return NextResponse.json({ error: askAmountResult.error }, { status: 400 })
        }
        const askAmount = askAmountResult.value

        const customSections = Array.isArray(body?.customSections)
            ? body.customSections
                .map((section: unknown) => {
                    const entry = section as {
                        title?: unknown
                        body?: unknown
                        imageUrl?: unknown
                        caption?: unknown
                    }
                    return {
                        title: trimString(entry?.title).slice(0, 120),
                        body: trimString(entry?.body).slice(0, 1200),
                        imageUrl: trimString(entry?.imageUrl),
                        caption: trimString(entry?.caption).slice(0, 200),
                    }
                })
                .filter((section: { title: string; body: string; imageUrl: string; caption: string }) =>
                    section.title || section.body || section.imageUrl || section.caption
                )
            : []

        const updated = await updateProductById({
            productId,
            name: name.slice(0, 120),
            tagline: tagline.slice(0, 240),
            description: nullableString(body?.description)?.slice(0, 2400) || null,
            problem: nullableString(body?.problem)?.slice(0, 1800) || null,
            solution: nullableString(body?.solution)?.slice(0, 1800) || null,
            websiteUrl: nullableString(body?.websiteUrl),
            stage: nullableString(body?.stage),
            askAmount,
            videoUrl: nullableString(body?.videoUrl),
            logoUrl: nullableString(body?.logoUrl),
            status,
            customSections,
        })

        return NextResponse.json({ product: updated })
    } catch (error) {
        console.error("[PRODUCT_UPDATE_ERROR]", error)
        const message = error instanceof Error ? error.message : "Failed to update product"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function DELETE(_req: Request, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.userType !== "FOUNDER") {
            return NextResponse.json({ error: "Only founders can delete products" }, { status: 403 })
        }

        const productId = context.params.id
        const product = await getProductById(productId)
        if (!product) {
            return NextResponse.json({ success: true })
        }

        try {
            await validateFounderOwner(session.user.id, productId)
        } catch (error) {
            if (error instanceof Error && error.message === "FOUNDER_NOT_FOUND") {
                return NextResponse.json({ error: "Founder profile not found" }, { status: 404 })
            }
            return NextResponse.json({ error: "You can only delete your own products" }, { status: 403 })
        }

        await deleteProductAndRelations(productId)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[PRODUCT_DELETE_ERROR]", error)
        const message = error instanceof Error ? error.message : "Failed to delete product"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
