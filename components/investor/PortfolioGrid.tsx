import styles from './PortfolioGrid.module.css'
import type { PortfolioCompanyRecord } from '@/lib/db/types'

interface PortfolioGridProps {
    companies: PortfolioCompanyRecord[]
    maxDisplay?: number
}

export default function PortfolioGrid({ companies, maxDisplay = 6 }: PortfolioGridProps) {
    const displayCompanies = companies
        .sort((a, b) => a.order - b.order)
        .slice(0, maxDisplay)

    if (displayCompanies.length === 0) {
        return <p className={styles.empty}>No portfolio companies yet</p>
    }

    return (
        <div className={styles.grid}>
            {displayCompanies.map((company) => (
                <div key={company.id} className={styles.card}>
                    {company.logoUrl ? (
                        <div className={styles.logoWrapper}>
                            <img
                                src={company.logoUrl}
                                alt={`${company.name} logo`}
                                className={styles.logo}
                            />
                        </div>
                    ) : (
                        <div className={styles.logoPlaceholder}>
                            {company.name.charAt(0).toUpperCase()}
                        </div>
                    )}

                    <div className={styles.details}>
                        <h3 className={styles.name}>{company.name}</h3>
                        <div className={styles.meta}>
                            <span className={styles.stage}>
                                {formatStage(company.stage)}
                            </span>
                            {company.isExited && (
                                <span className={styles.exitBadge}>
                                    ✨ Exited {company.exitYear ? `'${String(company.exitYear).slice(-2)}` : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
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
