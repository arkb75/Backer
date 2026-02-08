import CompanyWizard from "@/components/company/CompanyWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import FounderControls from "@/components/founder/FounderControls"
import FounderBottomNav from "@/components/founder/FounderBottomNav"
import { countUnreadConversationsForFounder, getFounderByUserId } from "@/lib/db/repository"

export default async function StartCompanyPage() {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        redirect('/')
    }

    const founder = await getFounderByUserId(session.user.id)

    if (!founder) {
        redirect('/onboarding')
    }

    const unreadMessagesCount = await countUnreadConversationsForFounder(founder.id)

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: '24px', paddingBottom: '120px' }}>
            <FounderControls />
            <CompanyWizard />
            <FounderBottomNav
                profileHref={`/founder/${founder.id}`}
                messageBadgeCount={unreadMessagesCount}
            />
        </div>
    )
}
