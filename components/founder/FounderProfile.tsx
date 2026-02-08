import { FounderWithRelations, InvestorStats } from '@/lib/types'
import ProductCard from './ProductCard'
import styles from './FounderProfile.module.css'
import {
    BackButton,
    SocialLinks,
    SocialLink,
    TagList,
    StatsGrid,
    StatItem,
    ExperienceList,
    ExperienceItem,
    VideoPlayer,
    PhotoCard,
    PromptCard,
} from '@/components/ui'

interface FounderProfileProps {
    founder: FounderWithRelations
    investorStats?: InvestorStats
    isInvestor: boolean
    isOwnProfile?: boolean
}

export default function FounderProfile({
    founder,
    investorStats,
    isInvestor,
    isOwnProfile = false,
}: FounderProfileProps) {
    // Sort photos and prompts
    const sortedPhotos = [...founder.photos].sort((a, b) => a.order - b.order)
    const sortedPrompts = [...founder.prompts].sort((a, b) => a.order - b.order)
    const experiences: ExperienceItem[] = founder.workExperience
        .sort((a, b) => a.order - b.order)
        .map((exp) => ({
            id: exp.id,
            role: exp.role,
            company: exp.company,
            years: exp.years,
        }))
    const skills = founder.skills.map((s) => s.name)

    const socialLinks: SocialLink[] = [
        ...(founder.linkedinUrl ? [{ type: 'linkedin' as const, url: founder.linkedinUrl }] : []),
        ...(founder.twitterUrl ? [{ type: 'twitter' as const, url: founder.twitterUrl }] : []),
        ...(founder.websiteUrl ? [{ type: 'website' as const, url: founder.websiteUrl }] : []),
    ]

    const investorStatsData: StatItem[] = investorStats
        ? [
            { value: `$${(investorStats.totalCommitted / 1000).toFixed(0)}K`, label: 'Total Raised' },
            { value: investorStats.likeCount, label: 'Interested' },
            { value: investorStats.committedCount, label: 'Committed' },
        ]
        : []

    // Interleave photos with prompts (Hinge-style)
    const contentItems: { type: 'photo' | 'prompt' | 'video' | 'info'; data: unknown; key: string }[] = []

    // First photo
    if (sortedPhotos[0]) {
        contentItems.push({ type: 'photo', data: sortedPhotos[0], key: `photo-0` })
    }

    // Info card (header)
    contentItems.push({ type: 'info', data: null, key: 'info' })

    // Interleave remaining photos and prompts
    const remainingPhotos = sortedPhotos.slice(1)
    let photoIdx = 0
    let promptIdx = 0

    while (photoIdx < remainingPhotos.length || promptIdx < sortedPrompts.length) {
        // Add a prompt
        if (promptIdx < sortedPrompts.length) {
            contentItems.push({ type: 'prompt', data: sortedPrompts[promptIdx], key: `prompt-${promptIdx}` })
            promptIdx++
        }
        // Add a photo
        if (photoIdx < remainingPhotos.length) {
            contentItems.push({ type: 'photo', data: remainingPhotos[photoIdx], key: `photo-${photoIdx + 1}` })
            photoIdx++
        }
    }

    // Add video if present (optional)
    if (founder.videoUrl) {
        contentItems.push({ type: 'video', data: founder.videoUrl, key: 'video' })
    }

    return (
        <div className={styles.profile}>
            {!isOwnProfile && <BackButton />}
            {/* Hinge-style vertical scroll */}
            <div className={styles.feed}>
                {contentItems.map((item) => {
                    if (item.type === 'photo') {
                        const photo = item.data as { url: string; caption?: string | null }
                        return <PhotoCard key={item.key} url={photo.url} caption={photo.caption} />
                    }

                    if (item.type === 'prompt') {
                        const prompt = item.data as { prompt: string; answer: string }
                        return <PromptCard key={item.key} prompt={prompt.prompt} answer={prompt.answer} />
                    }

                    if (item.type === 'video') {
                        return (
                            <div key={item.key} className={styles.videoCard}>
                                <p className={styles.videoLabel}>📹 Video Introduction</p>
                                <VideoPlayer videoUrl={item.data as string} title={`Intro by ${founder.name}`} />
                            </div>
                        )
                    }

                    if (item.type === 'info') {
                        return (
                            <div key={item.key} className={styles.infoCard}>
                                <h1 className={styles.name}>{founder.name}</h1>
                                <p className={styles.headline}>{founder.headline}</p>

                                <div className={styles.quickInfo}>
                                    <span>📍 {founder.location}</span>
                                    <span>🏷️ {formatFounderType(founder.founderType)}</span>
                                    {founder.yearsExperience && <span>💼 {founder.yearsExperience}y exp</span>}
                                </div>

                                <div className={styles.bio}>{founder.bio}</div>

                                <SocialLinks links={socialLinks} />
                            </div>
                        )
                    }

                    return null
                })}

                {/* Products Section */}
                {founder.products.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>🚀 Products</h2>
                        <div className={styles.productGrid}>
                            {founder.products.map((fp) => (
                                <ProductCard
                                    key={fp.id}
                                    product={fp.product}
                                    role={fp.role}
                                    isPrimary={fp.isPrimary}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Background Section */}
                {experiences.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>💼 Background</h2>
                        <ExperienceList experiences={experiences} maxDisplay={3} />
                    </div>
                )}


                {/* Investor-Only Section */}
                {isInvestor && investorStats && (
                    <div className={`${styles.section} ${styles.investorSection}`}>
                        <h2 className={styles.sectionTitle}>📊 Investor Insights</h2>
                        <StatsGrid stats={investorStatsData} />
                    </div>
                )}
            </div>
        </div>
    )
}

function formatFounderType(type: string): string {
    const typeMap: Record<string, string> = {
        FIRST_TIME: 'First-time Founder',
        SERIAL: 'Serial Founder',
        EXITED: 'Exited Founder',
    }
    return typeMap[type] || type
}
