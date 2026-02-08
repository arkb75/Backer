import { ReelsFeed, type FeedItem } from '@/components/feed/ReelsFeed'
import {
    getProductsByIds,
    listFounderProductsByFounderId,
    listFounders,
    getInvestorByUserId,
} from '@/lib/db/repository'
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
            const primaryRelation = relations.find((relation) => relation.isPrimary) || relations[0]
            const firstProductWithVideo = relations
                .map((relation) => productsById.get(relation.productId))
                .find((product) => Boolean(product?.videoUrl))
        const primaryProduct = primaryRelation
            ? productsById.get(primaryRelation.productId)
            : null
        const avatar = founder.photos[0]?.url || null
            const videoUrl = founder.videoUrl || firstProductWithVideo?.videoUrl || null
            if (!videoUrl) {
                return []
            }

            return [{
                id: founder.id,
                targetUrl: `/founder/${founder.id}`,
                name: primaryProduct?.name || founder.name,
                tagline: primaryProduct?.tagline || founder.headline,
                description: primaryProduct?.description ?? founder.bio ?? null,
                videoUrl,
                logoUrl: primaryProduct?.logoUrl ?? avatar ?? null,
                stage: primaryProduct?.stage ?? null,
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
