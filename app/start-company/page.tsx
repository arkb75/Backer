import CompanyWizard from "@/components/company/CompanyWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import FounderControls from "@/components/founder/FounderControls"
import FounderBottomNav from "@/components/founder/FounderBottomNav"
import { getFounderByUserId, listInvestorInterestsByFounderId, listConversationsByFounderId } from "@/lib/db/repository"

export default async function StartCompanyPage() {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        redirect('/')
    }

    const founder = await getFounderByUserId(session.user.id)

    if (!founder) {
        redirect('/onboarding')
    }

    // Get interests and conversations for badge count
    const [interests, conversations] = await Promise.all([
        listInvestorInterestsByFounderId(founder.id),
        listConversationsByFounderId(founder.id),
    ])

    const conversationInvestorIds = new Set(conversations.map((c) => c.investorId))
    const newInterestsCount = interests.filter(
        (i) => i.investorId && !conversationInvestorIds.has(i.investorId)
    ).length

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafe', paddingTop: '24px', paddingBottom: '120px' }}>
            <FounderControls />
            <CompanyWizard />
            <FounderBottomNav
                activeTab="products"
                profileHref={`/founder/${founder.id}`}
                messageBadgeCount={newInterestsCount}
            />
        </div>
    )
}
