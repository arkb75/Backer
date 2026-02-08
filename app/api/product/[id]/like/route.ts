import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
    getInvestorByUserId,
    getProductById,
    getProductLikeState,
    listFounderProductsByProductId,
    toggleProductLike,
} from "@/lib/db/repository"

interface RouteContext {
    params: {
        id: string
    }
}

export async function GET(_request: Request, context: RouteContext) {
    try {
        const productId = context.params.id
        const product = await getProductById(productId)
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        const session = await getServerSession(authOptions)
        if (!session?.user?.id || session.user.userType !== "INVESTOR") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const investor = await getInvestorByUserId(session.user.id)
        const state = await getProductLikeState({
            productId,
            investorId: investor?.id || null,
        })

        return NextResponse.json(state)
    } catch (error) {
        console.error("[PRODUCT_LIKE_GET_ERROR]", error)
        return NextResponse.json({ error: "Failed to load likes" }, { status: 500 })
    }
}

export async function POST(_request: Request, context: RouteContext) {
    try {
        const productId = context.params.id
        const product = await getProductById(productId)
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        const session = await getServerSession(authOptions)
        if (!session?.user?.id || session.user.userType !== "INVESTOR") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const investor = await getInvestorByUserId(session.user.id)
        if (!investor) {
            return NextResponse.json(
                { error: "Complete investor onboarding first" },
                { status: 400 }
            )
        }

        const founderRelations = await listFounderProductsByProductId(productId)
        const primaryRelation = founderRelations.find((relation) => relation.isPrimary) || founderRelations[0]

        const state = await toggleProductLike({
            productId,
            investorId: investor.id,
            founderId: primaryRelation?.founderId || null,
        })

        return NextResponse.json(state)
    } catch (error) {
        console.error("[PRODUCT_LIKE_TOGGLE_ERROR]", error)
        return NextResponse.json({ error: "Failed to update like" }, { status: 500 })
    }
}
