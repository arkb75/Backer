import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import {
    getInvestorByUserId,
    getConversationById,
    listMessagesByConversationId,
    getFounderById,
    getProductById,
} from "@/lib/db/repository"
import InvestorBottomNav from "@/components/investor/InvestorBottomNav"
import ChatView from "@/components/messages/ChatView"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ conversationId: string }>
}

export default async function InvestorConversationPage({ params }: PageProps) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        redirect("/login")
    }
    if (session.user.userType !== "INVESTOR") {
        redirect("/")
    }

    const viewerInvestor = await getInvestorByUserId(session.user.id)
    if (!viewerInvestor) {
        redirect("/investor/onboarding")
    }

    const { conversationId } = await params

    // Get conversation
    const conversation = await getConversationById(conversationId)
    if (!conversation) {
        notFound()
    }

    // Verify access
    if (conversation.investorId !== viewerInvestor.id) {
        redirect("/investor/messages")
    }

    // Get messages and enrichment data
    const [messages, founder, product] = await Promise.all([
        listMessagesByConversationId(conversationId),
        getFounderById(conversation.founderId),
        getProductById(conversation.productId),
    ])

    const profileHref = `/investor/${viewerInvestor.id}`

    return (
        <div style={{ minHeight: "100vh", paddingBottom: "96px", background: "black" }}>
            <div style={{ height: "calc(100vh - 96px)" }}>
                <ChatView
                    conversationId={conversationId}
                    messages={messages}
                    currentUserType="INVESTOR"
                    currentUserId={viewerInvestor.id}
                    otherPartyName={founder?.name || 'Unknown Founder'}
                    productName={product?.name}
                    backPath="/investor/messages"
                    canSend={true}
                />
            </div>
            <InvestorBottomNav activeTab="messages" profileHref={profileHref} />
        </div>
    )
}
