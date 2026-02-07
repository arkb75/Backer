import styles from './TagList.module.css'

interface TagListProps {
    tags: string[]
    maxDisplay?: number
    variant?: 'default' | 'gradient'
}

export default function TagList({ tags, maxDisplay = 10, variant = 'default' }: TagListProps) {
    const displayTags = tags.slice(0, maxDisplay)

    return (
        <div className={styles.tagList}>
            {displayTags.map((tag, i) => (
                <span
                    key={i}
                    className={`${styles.tag} ${variant === 'gradient' ? styles.gradient : ''}`}
                >
                    {tag}
                </span>
            ))}
        </div>
    )
}
