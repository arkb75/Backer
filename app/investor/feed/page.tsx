import { ReelsFeed, type FeedItem } from '@/components/feed/ReelsFeed'
import {
    getFoundersByIds,
    listFounderProductsByProductId,
    listProducts,
} from '@/lib/db/repository'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
    const products = (await listProducts()).filter((product) => Boolean(product.videoUrl))

    // If no products with videos, show empty state
    if (products.length === 0) {
        return (
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
                <h2 style={{ marginBottom: '1rem' }}>No videos yet</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Check back soon for founder pitch videos!
                </p>
            </div>
        )
    }

    const founderRelationsByProduct = await Promise.all(
        products.map((product) => listFounderProductsByProductId(product.id))
    )

    const founderIds = Array.from(new Set(
        founderRelationsByProduct.flatMap((relations) =>
            relations.map((relation) => relation.founderId)
        )
    ))
    const founders = await getFoundersByIds(founderIds)
    const foundersById = new Map(founders.map((founder) => [founder.id, founder]))

    // Transform data for client component
    const feedItems: FeedItem[] = products.map((product, index) => ({
        id: product.id,
        name: product.name,
        tagline: product.tagline,
        description: product.description ?? null,
        videoUrl: product.videoUrl as string,
        logoUrl: product.logoUrl ?? null,
        stage: product.stage ?? null,
        founders: founderRelationsByProduct[index]
            .map((relation) => {
                const founder = foundersById.get(relation.founderId)
                if (!founder) return null

                const avatar = [...founder.photos].sort((a, b) => a.order - b.order)[0]?.url || null
                return {
                    id: founder.id,
                    name: founder.name,
                    avatar,
                }
            })
            .filter((founder): founder is FeedItem["founders"][number] => founder !== null),
    }))

    return <ReelsFeed items={feedItems} />
}
