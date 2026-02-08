import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
    countUnreadConversationsForFounder,
    getFounderByUserId,
    listConversationsByFounderId,
    getInvestorById,
    getProductsByIds,
    listInvestorInterestsByFounderId,
} from "@/lib/db/repository"
import FounderBottomNav from "@/components/founder/FounderBottomNav"
import ConversationList, { ConversationItem } from "@/components/messages/ConversationList"

export const dynamic = 'force-dynamic'

export default async function FounderMessagesPage() {
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

    const profileHref = `/founder/${founder.id}`

    // Get conversations
    const conversations = await listConversationsByFounderId(founder.id)

    // Get investor interests to show interested investors count
    const interests = await listInvestorInterestsByFounderId(founder.id)

    // Enrich with investor and product data
    const investorIds = Array.from(new Set(conversations.map((c) => c.investorId)))
    const productIds = Array.from(new Set(conversations.map((c) => c.productId)))

    const [products] = await Promise.all([
        getProductsByIds(productIds),
    ])

    // Get investors individually (batch not available yet)
    const investors = await Promise.all(
        investorIds.map((id) => getInvestorById(id))
    )

    const investorsById = new Map(
        investors.filter((i): i is NonNullable<typeof i> => i !== null).map((i) => [i.id, i])
    )
    const productsById = new Map(products.map((p) => [p.id, p]))

    const enrichedConversations: ConversationItem[] = conversations.map((conv) => {
        const investor = investorsById.get(conv.investorId)
        const product = productsById.get(conv.productId)
        return {
            ...conv,
            otherPartyName: investor?.name || 'Unknown Investor',
            otherPartyAvatar: investor?.profileImage || null,
            productName: product?.name || undefined,
        }
    })

    // Count interested investors who haven't started conversations yet
    const conversationInvestorIds = new Set(conversations.map((c) => c.investorId))
    const newInterestsCount = interests.filter(
        (i) => i.investorId && !conversationInvestorIds.has(i.investorId)
    ).length
    const unreadMessagesCount = await countUnreadConversationsForFounder(founder.id)

    return (
        <div style={{ minHeight: "100vh", paddingBottom: "96px", background: "black" }}>
            <div style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <h1 style={{ color: "white", margin: 0, fontSize: "1.5rem" }}>Messages</h1>
                {newInterestsCount > 0 && (
                    <p style={{ color: "rgba(255,255,255,0.7)", margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
                        🎉 {newInterestsCount} new investor{newInterestsCount > 1 ? 's' : ''} interested in your product!
                    </p>
                )}
            </div>
            <div style={{ height: "calc(100vh - 180px)" }}>
                <ConversationList
                    conversations={enrichedConversations}
                    userType="FOUNDER"
                    basePath="/founder/messages"
                />
            </div>
            <FounderBottomNav
                activeTab="messages"
                profileHref={profileHref}
                messageBadgeCount={unreadMessagesCount}
            />
        </div>
    )
}
