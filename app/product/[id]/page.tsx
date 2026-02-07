import { prisma } from '@/lib/prisma'
import ProductProfile from '@/components/product/ProductProfile'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: PageProps) {
    const { id } = await params

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            founders: {
                include: {
                    founder: {
                        include: {
                            photos: true,
                        },
                    },
                },
            },
            investorInterests: {
                select: {
                    interestType: true,
                    amountCommitted: true,
                },
            },
        },
    })

    if (!product) {
        notFound()
    }

    // Calculate stats
    const stats = {
        interestedCount: product.investorInterests.filter((i) => i.interestType === 'LIKED')
            .length,
        committedAmount: product.investorInterests.reduce(
            (sum, i) => sum + (i.amountCommitted || 0),
            0
        ),
    }

    // TODO: Replace with actual auth check
    const isInvestor = false

    const handleLike = async () => {
        'use server'
        // TODO: Implement like functionality
        console.log('Like product:', id)
    }

    const handleCommit = async () => {
        'use server'
        // TODO: Implement commit functionality
        console.log('Commit to product:', id)
    }

    return (
        <main>
            <ProductProfile
                product={product as any}
                stats={stats}
                isInvestor={isInvestor}
                onLike={handleLike}
                onCommit={handleCommit}
            />
        </main>
    )
}
