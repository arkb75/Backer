import styles from './SocialLinks.module.css'

export interface SocialLink {
    type: 'linkedin' | 'twitter' | 'website' | 'other'
    url: string
    label?: string
}

interface SocialLinksProps {
    links: SocialLink[]
}

const iconMap: Record<string, string> = {
    linkedin: '🔗',
    twitter: '🐦',
    website: '🌐',
    other: '🔗',
}

const labelMap: Record<string, string> = {
    linkedin: 'LinkedIn',
    twitter: 'Twitter',
    website: 'Website',
}

export default function SocialLinks({ links }: SocialLinksProps) {
    if (links.length === 0) return null

    return (
        <div className={styles.socialLinks}>
            {links.map((link, i) => (
                <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                >
                    {iconMap[link.type]} {link.label || labelMap[link.type] || link.type}
                </a>
            ))}
        </div>
    )
}
