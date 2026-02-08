import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
    getInvestorByUserId,
    listConversationsByInvestorId,
    getFoundersByIds,
    getProductsByIds,
} from "@/lib/db/repository"
import InvestorBottomNav from "@/components/investor/InvestorBottomNav"
import ConversationList, { ConversationItem } from "@/components/messages/ConversationList"
import pageStyles from "@/components/messages/MessagesPage.module.css"

export const dynamic = 'force-dynamic'

export default async function InvestorMessagesPage() {
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

    const profileHref = `/investor/${viewerInvestor.id}`

    // Get conversations
    const conversations = await listConversationsByInvestorId(viewerInvestor.id)

    // Enrich with founder and product data
    const founderIds = Array.from(new Set(conversations.map((c) => c.founderId)))
    const productIds = Array.from(new Set(conversations.map((c) => c.productId)))

    const [founders, products] = await Promise.all([
        getFoundersByIds(founderIds),
        getProductsByIds(productIds),
    ])

    const foundersById = new Map(founders.map((f) => [f.id, f]))
    const productsById = new Map(products.map((p) => [p.id, p]))

    const enrichedConversations: ConversationItem[] = conversations.map((conv) => {
        const founder = foundersById.get(conv.founderId)
        const product = productsById.get(conv.productId)
        return {
            ...conv,
            otherPartyName: founder?.name || 'Unknown Founder',
            otherPartyAvatar: founder?.photos?.[0]?.url || null,
            productName: product?.name || undefined,
        }
    })

    return (
        <div className={pageStyles.page}>
            <div className={pageStyles.headerWrap}>
                <div className={pageStyles.headerCard}>
                    <h1 className={pageStyles.title}>Messages</h1>
                </div>
            </div>
            <div className={pageStyles.listViewport}>
                <ConversationList
                    conversations={enrichedConversations}
                    userType="INVESTOR"
                    basePath="/investor/messages"
                />
            </div>
            <InvestorBottomNav activeTab="messages" profileHref={profileHref} />
        </div>
    )
}
