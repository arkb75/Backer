'use client'

import { useState } from 'react'
import type { ProductRecord, FounderProductRecord, FounderRecord, FounderPhotoRecord } from '@/lib/db/types'
import styles from './ProductProfile.module.css'
import { BackButton, VideoPlayer, StatsGrid, StatItem } from '@/components/ui'
import TeamCard from './TeamCard'
import ProductActions from './ProductActions'

type ProductWithRelations = ProductRecord & {
    founders: (FounderProductRecord & {
        founder: FounderRecord & {
            photos: FounderPhotoRecord[]
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
    founderId?: string | null
    hasLiked?: boolean
    hasCommitted?: boolean
}

export default function ProductProfile({
    product,
    stats,
    isInvestor,
    founderId,
    hasLiked = false,
    hasCommitted = false,
}: ProductProfileProps) {
    const [likeCount, setLikeCount] = useState(stats.interestedCount)

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
        { value: likeCount, label: 'Interested' },
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
                {isInvestor && founderId && (
                    <div className={`${styles.section} ${styles.investorActions}`}>
                        <h2 className={styles.sectionTitle}>Express Interest</h2>
                        <ProductActions
                            productId={product.id}
                            founderId={founderId}
                            isLiked={hasLiked}
                            isCommitted={hasCommitted}
                            onLikeStateChange={({ likeCount: nextLikeCount }) => {
                                setLikeCount(nextLikeCount)
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
