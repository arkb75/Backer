import styles from './ProfileHeader.module.css'
import { ReactNode } from 'react'

export interface ProfileHeaderProps {
    name: string
    headline: string
    tags?: { icon: string; label: string }[]
    children?: ReactNode // For social links or other extras
}

export default function ProfileHeader({ name, headline, tags, children }: ProfileHeaderProps) {
    return (
        <div className={styles.header}>
            <h1 className={styles.name}>{name}</h1>
            <p className={styles.headline}>{headline}</p>

            {tags && tags.length > 0 && (
                <div className={styles.tags}>
                    {tags.map((tag, i) => (
                        <span key={i} className={styles.tag}>
                            {tag.icon} {tag.label}
                        </span>
                    ))}
                </div>
            )}

            {children}
        </div>
    )
}
