import ProductProfile from '@/components/product/ProductProfile'
import { notFound } from 'next/navigation'
import {
    getFoundersByIds,
    getFounderByUserId,
    getInvestorByUserId,
    getProductById,
    listFounderProductsByProductId,
    listInvestorInterestsByProductId,
    getInvestorInterestByInvestorAndProduct,
} from '@/lib/db/repository'
import type { FounderRecord, FounderPhotoRecord, FounderProductRecord, ProductRecord } from '@/lib/db/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type ProductWithRelations = ProductRecord & {
    founders: (FounderProductRecord & {
        founder: FounderRecord & {
            photos: FounderPhotoRecord[]
        }
    })[]
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: PageProps) {
    const { id } = await params

    const product = await getProductById(id)

    if (!product) {
        notFound()
    }

    const [founderRelations, investorInterests] = await Promise.all([
        listFounderProductsByProductId(product.id),
        listInvestorInterestsByProductId(product.id),
    ])

    const founders = await getFoundersByIds(founderRelations.map((relation) => relation.founderId))
    const foundersById = new Map(founders.map((founder) => [founder.id, founder]))

    const foundersWithRelations: ProductWithRelations["founders"] = founderRelations
        .map((relation) => {
            const founder = foundersById.get(relation.founderId)
            if (!founder) return null
            return {
                ...relation,
                founder,
            }
        })
        .filter((row): row is ProductWithRelations["founders"][number] => row !== null)

    const productWithRelations: ProductWithRelations = {
        ...product,
        founders: foundersWithRelations,
    }

    // Calculate stats
    const stats = {
        interestedCount: investorInterests.filter((interest) => interest.interestType === 'LIKED').length,
        committedAmount: investorInterests.reduce(
            (sum, interest) => sum + (interest.amountCommitted || 0),
            0
        ),
    }

    const session = await getServerSession(authOptions)
    const isInvestor = session?.user?.userType === 'INVESTOR'
    const viewerFounder = session?.user?.id && session.user.userType === 'FOUNDER'
        ? await getFounderByUserId(session.user.id)
        : null
    const isFounderOwner = viewerFounder
        ? founderRelations.some((relation) => relation.founderId === viewerFounder.id)
        : false

    // Get primary founder for messaging
    const primaryFounderRelation = foundersWithRelations.find((f) => f.isPrimary) || foundersWithRelations[0]
    const primaryFounderId = primaryFounderRelation?.founderId || null

    // Check if current investor has already liked this product
    let hasLiked = false
    let hasCommitted = false
    if (isInvestor && session?.user?.id) {
        const investor = await getInvestorByUserId(session.user.id)
        if (investor) {
            const existingInterest = await getInvestorInterestByInvestorAndProduct(investor.id, product.id)
            if (existingInterest) {
                hasLiked = existingInterest.interestType === 'LIKED'
                hasCommitted = existingInterest.interestType === 'COMMITTED'
            }
        }
    }

    return (
        <main>
            <ProductProfile
                product={productWithRelations}
                stats={stats}
                isInvestor={isInvestor}
                isFounderOwner={isFounderOwner}
                founderId={primaryFounderId}
                hasLiked={hasLiked}
                hasCommitted={hasCommitted}
            />
        </main>
    )
}
