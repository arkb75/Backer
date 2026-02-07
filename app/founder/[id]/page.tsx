import { prisma } from '@/lib/prisma'
import { FounderWithRelations, InvestorStats } from '@/lib/types'
import FounderProfile from '@/components/founder/FounderProfile'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function FounderPage({ params }: PageProps) {
    const { id } = await params

    // Fetch founder with all relations
    const founder = await prisma.founder.findUnique({
        where: { id },
        include: {
            products: {
                include: {
                    product: true,
                },
            },
            workExperience: true,
            skills: true,
            investorInterests: {
                select: {
                    interestType: true,
                    amountCommitted: true,
                },
            },
        },
    })

    if (!founder) {
        notFound()
    }

    // Calculate investor stats from interests
    const investorStats: InvestorStats = {
        likeCount: founder.investorInterests.filter((i) => i.interestType === 'LIKED')
            .length,
        committedCount: founder.investorInterests.filter(
            (i) => i.interestType === 'COMMITTED'
        ).length,
        totalCommitted: founder.investorInterests.reduce(
            (sum, i) => sum + (i.amountCommitted || 0),
            0
        ),
    }

    // TODO: Replace with actual auth check
    // For now, we'll pass isInvestor as false - will be implemented with NextAuth
    const isInvestor = false

    return (
        <main>
            <FounderProfile
                founder={founder as FounderWithRelations}
                investorStats={investorStats}
                isInvestor={isInvestor}
            />
        </main>
    )
}
