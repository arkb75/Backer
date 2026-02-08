import ProductProfile from '@/components/product/ProductProfile'
import { notFound } from 'next/navigation'
import {
    getFoundersByIds,
    getInvestorByUserId,
    getProductById,
    listFounderProductsByProductId,
    listInvestorInterestsByProductId,
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
    const viewerInvestor = isInvestor && session?.user?.id
        ? await getInvestorByUserId(session.user.id)
        : null
    const hasLiked = viewerInvestor
        ? investorInterests.some(
            (interest) =>
                interest.interestType === 'LIKED' &&
                interest.investorId === viewerInvestor.id
        )
        : false

    return (
        <main>
            <ProductProfile
                product={productWithRelations}
                stats={stats}
                productId={productWithRelations.id}
                initialLiked={hasLiked}
                isInvestor={isInvestor}
            />
        </main>
    )
}
