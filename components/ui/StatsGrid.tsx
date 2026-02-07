import styles from './StatsGrid.module.css'

export interface StatItem {
    value: string | number
    label: string
}

interface StatsGridProps {
    stats: StatItem[]
}

export default function StatsGrid({ stats }: StatsGridProps) {
    return (
        <div className={styles.statsGrid}>
            {stats.map((stat, i) => (
                <div key={i} className={styles.statCard}>
                    <div className={styles.statValue}>{stat.value}</div>
                    <div className={styles.statLabel}>{stat.label}</div>
                </div>
            ))}
        </div>
    )
}
