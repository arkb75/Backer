import { prisma } from '@/lib/prisma'
import { ReelsFeed } from '@/components/feed/ReelsFeed'

// Type for product with founders
interface ProductWithFounders {
    id: string
    name: string
    tagline: string
    description: string | null
    videoUrl: string | null
    logoUrl: string | null
    stage: string | null
    founders: {
        founder: {
            id: string
            name: string
            photos: { url: string; order: number }[]
        }
    }[]
}

export default async function FeedPage() {
    // Fetch products with videos and their founders
    const products = await prisma.product.findMany({
        where: {
            videoUrl: { not: null }
        },
        include: {
            founders: {
                include: {
                    founder: {
                        select: {
                            id: true,
                            name: true,
                            photos: {
                                orderBy: { order: 'asc' },
                                take: 1
                            }
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    }) as ProductWithFounders[]

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

    // Transform data for client component
    const feedItems = products.map(product => ({
        id: product.id,
        name: product.name,
        tagline: product.tagline,
        description: product.description,
        videoUrl: product.videoUrl!,
        logoUrl: product.logoUrl,
        stage: product.stage,
        founders: product.founders.map(fp => ({
            id: fp.founder.id,
            name: fp.founder.name,
            avatar: fp.founder.photos[0]?.url || null
        }))
    }))

    return <ReelsFeed items={feedItems} />
}
