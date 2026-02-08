import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import {
    createInvestment,
    getInvestorByUserId,
    getProductById,
    listFounderProductsByProductId,
    updateProductAmountRaised,
    createInvestorInterest,
    getInvestorInterestByInvestorAndProduct,
    createConversation,
    getConversationByParticipants,
    createMessage,
} from "@/lib/db/repository"

// POST - Commit investment to a product
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (session.user.userType !== "INVESTOR") {
            return NextResponse.json(
                { error: "Only investors can commit funds" },
                { status: 403 }
            )
        }

        const body = await req.json()
        const { productId, amount, founderId } = body

        if (!productId || !founderId) {
            return NextResponse.json(
                { error: "productId and founderId are required" },
                { status: 400 }
            )
        }

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { error: "amount must be greater than 0" },
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

        // Verify founder is associated with product
        const founderProducts = await listFounderProductsByProductId(productId)
        const isValidFounder = founderProducts.some((fp) => fp.founderId === founderId)
        if (!isValidFounder) {
            return NextResponse.json(
                { error: "Founder is not associated with this product" },
                { status: 400 }
            )
        }

        // Create investment record
        const investment = await createInvestment({
            investorId: investor.id,
            founderId,
            productId,
            amount,
        })

        // Update product's amountRaised
        await updateProductAmountRaised(productId, amount)

        // Create or update investor interest
        const existingInterest = await getInvestorInterestByInvestorAndProduct(
            investor.id,
            productId
        )

        if (!existingInterest) {
            await createInvestorInterest({
                investorId: investor.id,
                founderId,
                productId,
                interestType: "COMMITTED",
                amountCommitted: amount,
            })
        }

        console.log('[Investment API] Looking for existing conversation:', {
            investorId: investor.id,
            founderId,
            productId,
        })

        // Get or create conversation
        let conversation = await getConversationByParticipants({
            investorId: investor.id,
            founderId,
            productId,
        })

        if (!conversation) {
            console.log('[Investment API] No conversation found, creating new one')
            conversation = await createConversation({
                investorId: investor.id,
                founderId,
                productId,
            })
        } else {
            console.log('[Investment API] Using existing conversation:', conversation.id)
        }

        // Send automatic message to founder
        const autoMessage = `🎉 ${investor.name} has committed $${amount.toLocaleString()} to ${product.name}!`
        console.log('[Investment API] Sending message to conversation:', conversation.id)

        await createMessage({
            conversationId: conversation.id,
            senderId: investor.id,
            senderType: "INVESTOR",
            content: autoMessage,
        })

        console.log('[Investment API] Investment committed successfully')

        return NextResponse.json({
            investment,
            conversation,
            message: "Investment committed successfully",
        }, { status: 201 })
    } catch (error: any) {
        console.error("Commit investment error:", error)
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
    }
}
