import { FounderWithRelations, InvestorStats } from '@/lib/types'
import FounderProfile from '@/components/founder/FounderProfile'
import FounderBottomNav from '@/components/founder/FounderBottomNav'
import { notFound } from 'next/navigation'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
    countUnreadConversationsForFounder,
    getFounderById,
    getProductsByIds,
    listFounderProductsByFounderId,
    listInvestorInterestsByFounderId,
} from "@/lib/db/repository"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function FounderPage({ params }: PageProps) {
    const { id } = await params

    const founder = await getFounderById(id)

    if (!founder) {
        notFound()
    }

    const [founderProducts, investorInterests] = await Promise.all([
        listFounderProductsByFounderId(founder.id),
        listInvestorInterestsByFounderId(founder.id),
    ])

    const products = await getProductsByIds(founderProducts.map((relation) => relation.productId))
    const productsById = new Map(products.map((product) => [product.id, product]))

    const founderProductRows: FounderWithRelations["products"] = founderProducts
        .map((relation) => {
            const product = productsById.get(relation.productId)
            if (!product) return null
            return {
                ...relation,
                product,
            }
        })
        .filter((row): row is FounderWithRelations["products"][number] => row !== null)

    const founderWithRelations: FounderWithRelations = {
        ...founder,
        products: founderProductRows,
    }

    // Calculate investor stats from interests
    const committedInterests = investorInterests.filter(
        (interest) => interest.interestType === 'COMMITTED'
    )

    const investorStats: InvestorStats = {
        likeCount: investorInterests.filter((interest) => interest.interestType === 'LIKED').length,
        committedCount: committedInterests.length,
        totalCommitted: committedInterests.reduce(
            (sum, interest) => sum + (interest.amountCommitted || 0),
            0
        ),
    }

    // Check if viewing own profile
    const session = await getServerSession(authOptions)
    const isOwnProfile = session?.user?.id === founder.userId

    // For now, we'll pass isInvestor as false - will be implemented with NextAuth
    // Or check session.user.userType === 'INVESTOR'
    const isInvestor = session?.user?.userType === 'INVESTOR'

    const unreadMessagesCount = isOwnProfile
        ? await countUnreadConversationsForFounder(founder.id)
        : 0

    return (
        <div style={{ minHeight: "100vh", paddingBottom: isOwnProfile ? "110px" : "0", background: "var(--color-bg)" }}>
            <FounderProfile
                founder={founderWithRelations}
                investorStats={investorStats}
                isInvestor={isInvestor}
                isOwnProfile={isOwnProfile}
            />
            {isOwnProfile && (
                <FounderBottomNav
                    activeTab="profile"
                    profileHref={`/founder/${founder.id}`}
                    messageBadgeCount={unreadMessagesCount}
                />
            )}
        </div>
    )
}
