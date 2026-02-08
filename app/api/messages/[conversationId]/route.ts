import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import {
    getConversationById,
    getFounderByUserId,
    getInvestorByUserId,
    listMessagesByConversationId,
    markConversationRead,
} from "@/lib/db/repository"

interface RouteParams {
    params: Promise<{ conversationId: string }>
}

// GET - Get messages for a specific conversation
export async function GET(req: Request, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { conversationId } = await params

        // Get the conversation
        const conversation = await getConversationById(conversationId)
        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
        }

        // Verify user has access to this conversation
        const userType = session.user.userType
        let hasAccess = false

        if (userType === "INVESTOR") {
            const investor = await getInvestorByUserId(session.user.id)
            hasAccess = investor?.id === conversation.investorId
        } else if (userType === "FOUNDER") {
            const founder = await getFounderByUserId(session.user.id)
            hasAccess = founder?.id === conversation.founderId
        }

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        if (userType === "INVESTOR" || userType === "FOUNDER") {
            await markConversationRead({
                conversationId,
                userType,
            })
        }

        const messages = await listMessagesByConversationId(conversationId)

        return NextResponse.json({ conversation, messages })
    } catch (error: any) {
        console.error("Get messages error:", error)
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
    }
}
