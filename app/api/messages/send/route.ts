import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import {
    createMessage,
    getConversationById,
    getFounderByUserId,
    getInvestorByUserId,
    hasInvestorInterestInFounder,
    listMessagesByConversationId,
} from "@/lib/db/repository"
import type { SenderType } from "@/lib/db/types"

// POST - Send a message
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { conversationId, content } = body

        if (!conversationId || !content?.trim()) {
            return NextResponse.json(
                { error: "conversationId and content are required" },
                { status: 400 }
            )
        }

        // Get the conversation
        const conversation = await getConversationById(conversationId)
        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
        }

        const userType = session.user.userType
        let senderId: string
        let senderType: SenderType

        if (userType === "INVESTOR") {
            const investor = await getInvestorByUserId(session.user.id)
            if (!investor) {
                return NextResponse.json({ error: "Investor profile not found" }, { status: 404 })
            }

            // Verify investor is part of this conversation
            if (investor.id !== conversation.investorId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 })
            }

            senderId = investor.id
            senderType = "INVESTOR"
        } else if (userType === "FOUNDER") {
            const founder = await getFounderByUserId(session.user.id)
            if (!founder) {
                return NextResponse.json({ error: "Founder profile not found" }, { status: 404 })
            }

            // Verify founder is part of this conversation
            if (founder.id !== conversation.founderId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 })
            }

            // Founders can message if:
            // 1. Investor has liked/committed, OR
            // 2. Investor has already sent messages in this conversation (can reply)
            const hasInterest = await hasInvestorInterestInFounder(
                conversation.investorId,
                founder.id
            )

            if (!hasInterest) {
                // Check if investor has sent any messages in this conversation
                const messages = await listMessagesByConversationId(conversationId)
                const investorHasMessaged = messages.some(
                    (msg) => msg.senderType === "INVESTOR"
                )

                if (!investorHasMessaged) {
                    return NextResponse.json(
                        { error: "You can only message investors who have liked/committed to your product or who have messaged you first" },
                        { status: 403 }
                    )
                }
            }

            senderId = founder.id
            senderType = "FOUNDER"
        } else {
            return NextResponse.json({ error: "Invalid user type" }, { status: 400 })
        }

        const message = await createMessage({
            conversationId,
            senderId,
            senderType,
            content: content.trim(),
        })

        return NextResponse.json({ message }, { status: 201 })
    } catch (error: any) {
        console.error("Send message error:", error)
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
    }
}
