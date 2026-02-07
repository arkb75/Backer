import styles from './ProfileLayout.module.css'
import { ReactNode } from 'react'

interface ProfileLayoutProps {
    children: ReactNode
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
    return <div className={styles.profile}>{children}</div>
}

interface ProfileHeroProps {
    videoSection?: ReactNode
    children: ReactNode
}

export function ProfileHero({ videoSection, children }: ProfileHeroProps) {
    return (
        <div className={styles.hero}>
            {videoSection && <div className={styles.videoSection}>{videoSection}</div>}
            <div className={styles.basics}>{children}</div>
        </div>
    )
}

interface ProfileSectionProps {
    title: string
    children: ReactNode
    variant?: 'default' | 'highlighted'
}

export function ProfileSection({ title, children, variant = 'default' }: ProfileSectionProps) {
    return (
        <section className={`${styles.section} ${variant === 'highlighted' ? styles.highlighted : ''}`}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            {children}
        </section>
    )
}
