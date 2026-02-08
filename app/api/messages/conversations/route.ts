import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import {
    getFounderByUserId,
    getInvestorByUserId,
    listConversationsByInvestorId,
    listConversationsByFounderId,
    createConversation,
    getConversationByParticipants,
    getFounderById,
    getInvestorById,
    getProductById,
    hasInvestorInterestInFounder,
} from "@/lib/db/repository"

// GET - List conversations for the authenticated user
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userType = session.user.userType

        if (userType === "INVESTOR") {
            const investor = await getInvestorByUserId(session.user.id)
            if (!investor) {
                return NextResponse.json({ error: "Investor profile not found" }, { status: 404 })
            }
            const conversations = await listConversationsByInvestorId(investor.id)
            return NextResponse.json({ conversations })
        } else if (userType === "FOUNDER") {
            const founder = await getFounderByUserId(session.user.id)
            if (!founder) {
                return NextResponse.json({ error: "Founder profile not found" }, { status: 404 })
            }
            const conversations = await listConversationsByFounderId(founder.id)
            return NextResponse.json({ conversations })
        }

        return NextResponse.json({ error: "Invalid user type" }, { status: 400 })
    } catch (error: any) {
        console.error("List conversations error:", error)
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
    }
}

// POST - Create a new conversation
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { founderId, productId } = body

        if (!founderId || !productId) {
            return NextResponse.json(
                { error: "founderId and productId are required" },
                { status: 400 }
            )
        }

        const userType = session.user.userType

        // Validate the founder and product exist
        const founder = await getFounderById(founderId)
        if (!founder) {
            return NextResponse.json({ error: "Founder not found" }, { status: 404 })
        }

        const product = await getProductById(productId)
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        let investorId: string

        if (userType === "INVESTOR") {
            // Investor can start a conversation with any founder
            const investor = await getInvestorByUserId(session.user.id)
            if (!investor) {
                return NextResponse.json({ error: "Investor profile not found" }, { status: 404 })
            }
            investorId = investor.id
        } else if (userType === "FOUNDER") {
            // Founder can only start conversation if investor has liked/committed to their product
            const founderProfile = await getFounderByUserId(session.user.id)
            if (!founderProfile) {
                return NextResponse.json({ error: "Founder profile not found" }, { status: 404 })
            }

            // The founderId in the request should match the current user's founder profile
            if (founderProfile.id !== founderId) {
                return NextResponse.json(
                    { error: "Founders can only start conversations for their own products" },
                    { status: 403 }
                )
            }

            // For founders, the body should include investorId
            if (!body.investorId) {
                return NextResponse.json(
                    { error: "investorId is required for founders to start conversations" },
                    { status: 400 }
                )
            }

            // Check if the investor has expressed interest
            const hasInterest = await hasInvestorInterestInFounder(body.investorId, founderId)
            if (!hasInterest) {
                return NextResponse.json(
                    { error: "You can only message investors who have liked or committed to your product" },
                    { status: 403 }
                )
            }

            investorId = body.investorId
        } else {
            return NextResponse.json({ error: "Invalid user type" }, { status: 400 })
        }

        // Check if conversation already exists
        const existingConversation = await getConversationByParticipants({
            investorId,
            founderId,
            productId,
        })

        if (existingConversation) {
            return NextResponse.json({ conversation: existingConversation })
        }

        // Create new conversation
        const conversation = await createConversation({
            investorId,
            founderId,
            productId,
        })

        return NextResponse.json({ conversation }, { status: 201 })
    } catch (error: any) {
        console.error("Create conversation error:", error)
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
    }
}
