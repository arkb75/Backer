import { FounderWithRelations, InvestorStats } from '@/lib/types'
import FounderVideo from './FounderVideo'
import ProductCard from './ProductCard'
import styles from './FounderProfile.module.css'

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
    return (
        <div className={styles.profile}>
            {/* Hero Section */}
            <div className={styles.hero}>
                <div className={styles.videoSection}>
                    {founder.videoUrl && (
                        <FounderVideo videoUrl={founder.videoUrl} founderName={founder.name} />
                    )}
                </div>

                <div className={styles.basics}>
                    <h1 className={styles.name}>{founder.name}</h1>
                    <p className={styles.headline}>{founder.headline}</p>

                    <div className={styles.tags}>
                        <span className={styles.tag}>📍 {founder.location}</span>
                        <span className={styles.tag}>
                            🏷️ {formatFounderType(founder.founderType)}
                        </span>
                        {founder.yearsExperience && (
                            <span className={styles.tag}>
                                💼 {founder.yearsExperience} years experience
                            </span>
                        )}
                    </div>

                    {/* Social Links */}
                    <div className={styles.socialLinks}>
                        {founder.linkedinUrl && (
                            <a
                                href={founder.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                            >
                                🔗 LinkedIn
                            </a>
                        )}
                        {founder.twitterUrl && (
                            <a
                                href={founder.twitterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                            >
                                🐦 Twitter
                            </a>
                        )}
                        {founder.websiteUrl && (
                            <a
                                href={founder.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                            >
                                🌐 Website
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* About Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>About</h2>
                <p className={styles.bio}>{founder.bio}</p>
            </section>

            {/* Products Section */}
            {founder.products.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Products</h2>
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
                </section>
            )}

            {/* Background Section */}
            {founder.workExperience.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Background</h2>
                    <ul className={styles.experienceList}>
                        {founder.workExperience
                            .sort((a, b) => a.order - b.order)
                            .slice(0, 3)
                            .map((exp) => (
                                <li key={exp.id} className={styles.experienceItem}>
                                    <strong>{exp.role}</strong> @ {exp.company} ({exp.years})
                                </li>
                            ))}
                    </ul>
                </section>
            )}

            {/* Skills Section */}
            {founder.skills.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Skills</h2>
                    <div className={styles.skillTags}>
                        {founder.skills.slice(0, 10).map((skill) => (
                            <span key={skill.id} className={styles.skillTag}>
                                {skill.name}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* Investor-Only Section */}
            {isInvestor && investorStats && (
                <section className={`${styles.section} ${styles.investorOnly}`}>
                    <h2 className={styles.sectionTitle}>Investor Insights</h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>
                                ${(investorStats.totalCommitted / 1000).toFixed(0)}K
                            </div>
                            <div className={styles.statLabel}>Total Raised</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{investorStats.likeCount}</div>
                            <div className={styles.statLabel}>Investors Interested</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{investorStats.committedCount}</div>
                            <div className={styles.statLabel}>Investors Committed</div>
                        </div>
                    </div>
                </section>
            )}
        </div>
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
