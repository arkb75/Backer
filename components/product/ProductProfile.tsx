import { Product, FounderProduct, Founder, FounderPhoto } from '@prisma/client'
import styles from './ProductProfile.module.css'
import { BackButton, VideoPlayer, StatsGrid, StatItem } from '@/components/ui'
import TeamCard from './TeamCard'

type ProductWithRelations = Product & {
    founders: (FounderProduct & {
        founder: Founder & {
            photos: FounderPhoto[]
        }
    })[]
    _count?: {
        investorInterests: number
    }
}

interface ProductStats {
    interestedCount: number
    committedAmount: number
}

interface ProductProfileProps {
    product: ProductWithRelations
    stats: ProductStats
    isInvestor: boolean
    onLike?: () => void
    onCommit?: () => void
}

export default function ProductProfile({
    product,
    stats,
    isInvestor,
    onLike,
    onCommit,
}: ProductProfileProps) {
    const formatStatus = (status: string): string => {
        const statusMap: Record<string, string> = {
            IDEA: 'Idea Stage',
            BUILDING: 'Building',
            LAUNCHED: 'Launched',
            RAISING: 'Raising Funds',
            FUNDED: 'Funded',
        }
        return statusMap[status] || status
    }

    const productStatsData: StatItem[] = [
        { value: `$${Math.floor((product.askAmount || 0) / 1000)}K`, label: 'Seeking' },
        { value: `$${Math.floor(product.amountRaised / 1000)}K`, label: 'Raised' },
        { value: stats.interestedCount, label: 'Interested' },
    ]

    return (
        <div className={styles.profile}>
            <BackButton />
            {/* Hero Video - Full Width */}
            {product.videoUrl && (
                <div className={styles.videoHero}>
                    <VideoPlayer videoUrl={product.videoUrl} title={`${product.name} pitch`} />
                </div>
            )}

            {/* Mobile-first vertical feed */}
            <div className={styles.feed}>
                {/* Product Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        {product.logoUrl && (
                            <img src={product.logoUrl} alt={`${product.name} logo`} className={styles.logo} />
                        )}
                        <div className={styles.headerText}>
                            <h1 className={styles.name}>{product.name}</h1>
                            <p className={styles.tagline}>{product.tagline}</p>
                            <div className={styles.badges}>
                                <span className={styles.statusBadge}>{formatStatus(product.status)}</span>
                                {product.stage && <span className={styles.stageBadge}>{product.stage}</span>}
                            </div>
                            {product.websiteUrl && (
                                <a
                                    href={product.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.website}
                                >
                                    🌐 Visit Website
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className={styles.section}>
                    <StatsGrid stats={productStatsData} />
                </div>

                {/* Description */}
                {product.description && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>About</h2>
                        <p className={styles.text}>{product.description}</p>
                    </div>
                )}

                {/* Problem */}
                {product.problem && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>The Problem</h2>
                        <p className={styles.text}>{product.problem}</p>
                    </div>
                )}

                {/* Solution */}
                {product.solution && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Our Solution</h2>
                        <p className={styles.text}>{product.solution}</p>
                    </div>
                )}

                {/* Team */}
                {product.founders.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>The Team</h2>
                        <div className={styles.teamGrid}>
                            {product.founders.map((fp) => {
                                const firstPhoto = fp.founder.photos.sort((a, b) => a.order - b.order)[0]
                                return (
                                    <TeamCard
                                        key={fp.id}
                                        founderId={fp.founder.id}
                                        name={fp.founder.name}
                                        role={fp.role}
                                        photoUrl={firstPhoto?.url}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Investor Actions */}
                {isInvestor && (
                    <div className={`${styles.section} ${styles.investorActions}`}>
                        <h2 className={styles.sectionTitle}>Express Interest</h2>
                        <div className={styles.actionButtons}>
                            <button onClick={onLike} className={`${styles.button} ${styles.likeButton}`}>
                                ❤️ Like This Startup
                            </button>
                            <button onClick={onCommit} className={`${styles.button} ${styles.commitButton}`}>
                                💰 Commit to Invest
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
