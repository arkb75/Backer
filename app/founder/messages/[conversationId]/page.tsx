import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import {
    getFounderByUserId,
    getConversationById,
    listMessagesByConversationId,
    getInvestorById,
    getProductById,
    hasInvestorInterestInFounder,
} from "@/lib/db/repository"
import FounderBottomNav from "@/components/founder/FounderBottomNav"
import ChatView from "@/components/messages/ChatView"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ conversationId: string }>
}

export default async function FounderConversationPage({ params }: PageProps) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        redirect("/login")
    }
    if (session.user.userType !== "FOUNDER") {
        redirect("/")
    }

    const founder = await getFounderByUserId(session.user.id)
    if (!founder) {
        redirect("/onboarding")
    }

    const { conversationId } = await params

    // Get conversation
    const conversation = await getConversationById(conversationId)
    if (!conversation) {
        notFound()
    }

    // Verify access
    if (conversation.founderId !== founder.id) {
        redirect("/founder/messages")
    }

    // Get messages and enrichment data
    const [messages, investor, product] = await Promise.all([
        listMessagesByConversationId(conversationId),
        getInvestorById(conversation.investorId),
        getProductById(conversation.productId),
    ])

    // Check if investor has expressed interest OR has already messaged
    const hasInterest = await hasInvestorInterestInFounder(conversation.investorId, founder.id)
    const investorHasMessaged = messages.some((msg) => msg.senderType === "INVESTOR")
    const canSend = hasInterest || investorHasMessaged

    const profileHref = `/founder/${founder.id}`

    return (
        <div style={{ minHeight: "100vh", paddingBottom: "96px", background: "black" }}>
            <div style={{ height: "calc(100vh - 96px)" }}>
                <ChatView
                    conversationId={conversationId}
                    messages={messages}
                    currentUserType="FOUNDER"
                    currentUserId={founder.id}
                    otherPartyName={investor?.name || 'Unknown Investor'}
                    productName={product?.name}
                    backPath="/founder/messages"
                    canSend={canSend}
                    cannotSendReason={
                        !canSend
                            ? "You can only message investors who have liked/committed to your product or who have messaged you first"
                            : undefined
                    }
                />
            </div>
            <FounderBottomNav activeTab="messages" profileHref={profileHref} />
        </div>
    )
}
