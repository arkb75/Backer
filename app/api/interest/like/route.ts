import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import {
    createInvestorInterest,
    getInvestorByUserId,
    getInvestorInterestByInvestorAndProduct,
    getProductById,
    listFounderProductsByProductId,
} from "@/lib/db/repository"
import type { InterestType } from "@/lib/db/types"

// POST - Like or commit to a product
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (session.user.userType !== "INVESTOR") {
            return NextResponse.json(
                { error: "Only investors can like products" },
                { status: 403 }
            )
        }

        const body = await req.json()
        const { productId, interestType = "LIKED", amountCommitted } = body

        if (!productId) {
            return NextResponse.json({ error: "productId is required" }, { status: 400 })
        }

        // Validate interest type
        const validTypes: InterestType[] = ["LIKED", "COMMITTED"]
        if (!validTypes.includes(interestType)) {
            return NextResponse.json(
                { error: "interestType must be LIKED or COMMITTED" },
                { status: 400 }
            )
        }

        // If committing, amount is required
        if (interestType === "COMMITTED" && (!amountCommitted || amountCommitted <= 0)) {
            return NextResponse.json(
                { error: "amountCommitted is required for COMMITTED interest type" },
                { status: 400 }
            )
        }

        // Get investor
        const investor = await getInvestorByUserId(session.user.id)
        if (!investor) {
            return NextResponse.json({ error: "Investor profile not found" }, { status: 404 })
        }

        // Get product
        const product = await getProductById(productId)
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        // Get founder(s) associated with this product
        const founderProducts = await listFounderProductsByProductId(productId)
        const primaryFounder = founderProducts.find((fp) => fp.isPrimary) || founderProducts[0]

        if (!primaryFounder) {
            return NextResponse.json({ error: "No founder associated with this product" }, { status: 404 })
        }

        // Check if interest already exists
        const existingInterest = await getInvestorInterestByInvestorAndProduct(
            investor.id,
            productId
        )

        if (existingInterest) {
            // If already liked and trying to commit, we could update, but for simplicity return existing
            return NextResponse.json({
                interest: existingInterest,
                message: "Interest already recorded",
            })
        }

        // Create new interest
        const interest = await createInvestorInterest({
            investorId: investor.id,
            founderId: primaryFounder.founderId,
            productId,
            interestType,
            amountCommitted: interestType === "COMMITTED" ? amountCommitted : null,
        })

        return NextResponse.json({ interest }, { status: 201 })
    } catch (error: any) {
        console.error("Like product error:", error)
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
    }
}
