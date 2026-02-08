import { InvestorWithRelations } from '@/lib/types'
import styles from './InvestorProfile.module.css'
import PortfolioGrid from './PortfolioGrid'
import { LogoutButton } from './LogoutButton'
import Link from 'next/link'
import {
    SocialLinks,
    SocialLink,
    TagList,
    ThemeToggle,
} from '@/components/ui'

interface InvestorProfileProps {
    investor: InvestorWithRelations
    isOwnProfile?: boolean
}

export default function InvestorProfile({ investor, isOwnProfile = false }: InvestorProfileProps) {
    const socialLinks: SocialLink[] = [
        ...(investor.linkedinUrl ? [{ type: 'linkedin' as const, url: investor.linkedinUrl }] : []),
        ...(investor.twitterUrl ? [{ type: 'twitter' as const, url: investor.twitterUrl }] : []),
        ...(investor.websiteUrl ? [{ type: 'website' as const, url: investor.websiteUrl }] : []),
    ]

    const interestTags = investor.interestTags.map((tag: { name: string }) => tag.name)
    const sortedPortfolio = [...investor.portfolio].sort((a, b) => a.order - b.order)

    // Build Hinge-style content feed
    const contentItems: { type: 'info' | 'thesis'; data: unknown; key: string }[] = []

    // Info card
    contentItems.push({ type: 'info', data: null, key: 'info' })

    // Investment thesis as a prompt-style card
    if (investor.bio) {
        contentItems.push({ type: 'thesis', data: investor.bio, key: 'thesis' })
    }

    return (
        <div className={styles.profile}>
            {/* Hinge-style vertical scroll */}
            <div className={styles.feed}>
                {contentItems.map((item) => {
                    if (item.type === 'info') {
                        return (
                            <div key={item.key} className={styles.infoCard}>
                                <div className={styles.infoActions}>
                                    <ThemeToggle />
                                    {isOwnProfile && (
                                        <Link href="/investor/edit" className={styles.editLink}>
                                            Edit Profile
                                        </Link>
                                    )}
                                </div>
                                <div className={styles.identityRow}>
                                    {investor.profileImage && (
                                        <img
                                            src={investor.profileImage}
                                            alt={`${investor.name} profile`}
                                            className={styles.avatar}
                                        />
                                    )}
                                    <div className={styles.identityText}>
                                        <h1 className={styles.name}>{investor.name}</h1>
                                        {investor.firmName && (
                                            <p className={styles.firm}>
                                                {investor.title ? `${investor.title} at ` : ''}
                                                {investor.firmName}
                                            </p>
                                        )}
                                        {!investor.firmName && investor.title && (
                                            <p className={styles.firm}>{investor.title}</p>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.quickInfo}>
                                    {investor.location && <span>📍 {investor.location}</span>}
                                    {investor.investmentStagePreference && (
                                        <span>💰 {formatStage(investor.investmentStagePreference)} stage</span>
                                    )}
                                </div>

                                <SocialLinks links={socialLinks} />
                            </div>
                        )
                    }

                    if (item.type === 'thesis') {
                        return (
                            <div key={item.key} className={styles.thesisCard}>
                                <p className={styles.thesisPrompt}>💡 Investment Thesis</p>
                                <p className={styles.thesisAnswer}>{item.data as string}</p>
                            </div>
                        )
                    }

                    return null
                })}

                {/* Portfolio Section */}
                {sortedPortfolio.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>🚀 Portfolio</h2>
                        <PortfolioGrid companies={sortedPortfolio} />
                    </div>
                )}

                {/* Industry Interests */}
                {interestTags.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>🎯 Industry Focus</h2>
                        <TagList tags={interestTags} maxDisplay={12} variant="gradient" />
                    </div>
                )}

                {isOwnProfile && <LogoutButton />}
            </div>
        </div>
    )
}

function formatStage(stage: string): string {
    const stageMap: Record<string, string> = {
        SEED: 'Seed',
        SERIES_A: 'Series A',
        SERIES_B: 'Series B',
        GROWTH: 'Growth',
    }
    return stageMap[stage] || stage
}
