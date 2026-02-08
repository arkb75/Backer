import { InvestorWithRelations } from '@/lib/types'
import InvestorProfile from '@/components/investor/InvestorProfile'
import { notFound } from 'next/navigation'
import { getInvestorById, getInvestorByUserId } from '@/lib/db/repository'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import InvestorBottomNav from '@/components/investor/InvestorBottomNav'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function InvestorPage({ params }: PageProps) {
    const { id } = await params

    const investor = await getInvestorById(id)
    const session = await getServerSession(authOptions)

    if (!investor) {
        notFound()
    }

    const viewerInvestor = session?.user?.id && session.user.userType === 'INVESTOR'
        ? await getInvestorByUserId(session.user.id)
        : null
    const profileHref = viewerInvestor ? `/investor/${viewerInvestor.id}` : '/investor/onboarding'

    return (
        <main style={{ paddingBottom: viewerInvestor ? '96px' : undefined }}>
            <InvestorProfile investor={investor as InvestorWithRelations} />
            {viewerInvestor && (
                <InvestorBottomNav
                    activeTab="profile"
                    profileHref={profileHref}
                />
            )}
        </main>
    )
}
