import { FounderWithRelations, InvestorStats } from '@/lib/types'
import ProductCard from './ProductCard'
import styles from './FounderProfile.module.css'
import {
    ProfileLayout,
    ProfileHero,
    ProfileSection,
    ProfileHeader,
    SocialLinks,
    SocialLink,
    TagList,
    StatsGrid,
    StatItem,
    ExperienceList,
    ExperienceItem,
    VideoPlayer,
} from '@/components/ui'

interface FounderProfileProps {
    founder: FounderWithRelations
    investorStats?: InvestorStats
    isInvestor: boolean
}

export default function FounderProfile({
    founder,
    investorStats,
    isInvestor,
}: FounderProfileProps) {
    // Prepare data for reusable components
    const profileTags = [
        { icon: '📍', label: founder.location },
        { icon: '🏷️', label: formatFounderType(founder.founderType) },
        ...(founder.yearsExperience
            ? [{ icon: '💼', label: `${founder.yearsExperience} years experience` }]
            : []),
    ]

    const socialLinks: SocialLink[] = [
        ...(founder.linkedinUrl ? [{ type: 'linkedin' as const, url: founder.linkedinUrl }] : []),
        ...(founder.twitterUrl ? [{ type: 'twitter' as const, url: founder.twitterUrl }] : []),
        ...(founder.websiteUrl ? [{ type: 'website' as const, url: founder.websiteUrl }] : []),
    ]

    const experiences: ExperienceItem[] = founder.workExperience
        .sort((a, b) => a.order - b.order)
        .map((exp) => ({
            id: exp.id,
            role: exp.role,
            company: exp.company,
            years: exp.years,
        }))

    const skills = founder.skills.map((s) => s.name)

    const investorStatsData: StatItem[] = investorStats
        ? [
            { value: `$${(investorStats.totalCommitted / 1000).toFixed(0)}K`, label: 'Total Raised' },
            { value: investorStats.likeCount, label: 'Investors Interested' },
            { value: investorStats.committedCount, label: 'Investors Committed' },
        ]
        : []

    return (
        <ProfileLayout>
            {/* Hero Section */}
            <ProfileHero
                videoSection={
                    founder.videoUrl && (
                        <VideoPlayer videoUrl={founder.videoUrl} title={`Introduction by ${founder.name}`} />
                    )
                }
            >
                <ProfileHeader name={founder.name} headline={founder.headline} tags={profileTags}>
                    <SocialLinks links={socialLinks} />
                </ProfileHeader>
            </ProfileHero>

            {/* About Section */}
            <ProfileSection title="About">
                <p className={styles.bio}>{founder.bio}</p>
            </ProfileSection>

            {/* Products Section */}
            {founder.products.length > 0 && (
                <ProfileSection title="Products">
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
                </ProfileSection>
            )}

            {/* Background Section */}
            {experiences.length > 0 && (
                <ProfileSection title="Background">
                    <ExperienceList experiences={experiences} maxDisplay={3} />
                </ProfileSection>
            )}

            {/* Skills Section */}
            {skills.length > 0 && (
                <ProfileSection title="Skills">
                    <TagList tags={skills} maxDisplay={10} variant="gradient" />
                </ProfileSection>
            )}

            {/* Investor-Only Section */}
            {isInvestor && investorStats && (
                <ProfileSection title="Investor Insights" variant="highlighted">
                    <StatsGrid stats={investorStatsData} />
                </ProfileSection>
            )}
        </ProfileLayout>
    )
}

function formatFounderType(type: string): string {
    const typeMap: Record<string, string> = {
        FIRST_TIME: 'First-time Founder',
        SERIAL: 'Serial Founder',
        EXITED: 'Founder with Exit',
    }
    return typeMap[type] || type
}
