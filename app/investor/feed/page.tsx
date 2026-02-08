import { ReelsFeed, type FeedItem } from '@/components/feed/ReelsFeed'
import {
    getProductsByIds,
    listFounderProductsByFounderId,
    listFounders,
    getInvestorByUserId,
} from '@/lib/db/repository'
import type { ProductRecord } from '@/lib/db/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import InvestorBottomNav from '@/components/investor/InvestorBottomNav'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        redirect('/login')
    }
    if (session.user.userType !== 'INVESTOR') {
        redirect('/')
    }
    const viewerInvestor = await getInvestorByUserId(session.user.id)
    const profileHref = viewerInvestor ? `/investor/${viewerInvestor.id}` : '/investor/onboarding'

    const founders = await listFounders()

    const founderProductRelations = await Promise.all(
        founders.map((founder) => listFounderProductsByFounderId(founder.id))
    )
    const relatedProductIds = Array.from(new Set(
        founderProductRelations.flatMap((relations) =>
            relations.map((relation) => relation.productId)
        )
    ))
    const products = await getProductsByIds(relatedProductIds)
    const productsById = new Map(products.map((product) => [product.id, product]))

    // Transform data for client component
    const feedItems: FeedItem[] = founders.flatMap((founder, index) => {
            const relations = founderProductRelations[index]
            const relationProducts = relations
                .map((relation) => ({
                    relation,
                    product: productsById.get(relation.productId),
                }))
                .filter((entry): entry is { relation: typeof relations[number]; product: ProductRecord } => Boolean(entry.product))

            const primaryEntry = relationProducts.find((entry) => entry.relation.isPrimary) || relationProducts[0]
            const productWithVideoEntry = relationProducts.find((entry) => Boolean(entry.product.videoUrl))
            const selectedProduct = productWithVideoEntry?.product || primaryEntry?.product || null
            const avatar = founder.photos[0]?.url || null
            const videoUrl = selectedProduct?.videoUrl || founder.videoUrl || null

            if (!selectedProduct) {
                return []
            }
            if (!videoUrl) {
                return []
            }

            return [{
                id: founder.id,
                targetUrl: `/product/${selectedProduct.id}`,
                name: selectedProduct.name || founder.name,
                tagline: selectedProduct.tagline || founder.headline,
                description: selectedProduct.description ?? founder.bio ?? null,
                videoUrl,
                logoUrl: selectedProduct.logoUrl ?? avatar ?? null,
                stage: selectedProduct.stage ?? null,
                founders: [{
                    id: founder.id,
                    name: founder.name,
                    avatar,
                }],
            }]
        })

    // If no pitch videos, show empty state
    if (feedItems.length === 0) {
        return (
            <div style={{ minHeight: '100vh', paddingBottom: '96px', background: 'black' }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    color: 'white',
                    textAlign: 'center',
                    padding: '2rem'
                }}>
                    <h2 style={{ marginBottom: '1rem' }}>No pitch videos yet</h2>
                    <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Upload a founder intro or company pitch video to appear here.
                    </p>
                </div>
                <InvestorBottomNav activeTab="feed" profileHref={profileHref} />
            </div>
        )
    }

    return (
        <>
            <ReelsFeed items={feedItems} />
            <InvestorBottomNav activeTab="feed" profileHref={profileHref} />
        </>
    )
}
