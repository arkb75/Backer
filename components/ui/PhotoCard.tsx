import styles from './PhotoCard.module.css'

interface PhotoCardProps {
    url: string
    caption?: string | null
}

export default function PhotoCard({ url, caption }: PhotoCardProps) {
    return (
        <div className={styles.card}>
            <img src={url} alt={caption || 'Profile photo'} className={styles.photo} />
            {caption && <p className={styles.caption}>{caption}</p>}
        </div>
    )
}
