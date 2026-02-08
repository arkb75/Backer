import { prisma } from '@/lib/prisma'
import { FounderWithRelations, InvestorStats } from '@/lib/types'
import FounderProfile from '@/components/founder/FounderProfile'
import { notFound } from 'next/navigation'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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
            photos: true,
            prompts: true,
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

    // Check if viewing own profile
    const session = await getServerSession(authOptions)
    const isOwnProfile = session?.user?.id === founder.userId

    // For now, we'll pass isInvestor as false - will be implemented with NextAuth
    // Or check session.user.userType === 'INVESTOR'
    const isInvestor = session?.user?.userType === 'INVESTOR'

    return (
        <main>
            <FounderProfile
                founder={founder as FounderWithRelations}
                investorStats={investorStats}
                isInvestor={isInvestor}
                isOwnProfile={isOwnProfile}
            />
        </main>
    )
}
