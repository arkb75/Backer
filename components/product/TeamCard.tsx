import styles from './TeamCard.module.css'
import Link from 'next/link'

interface TeamCardProps {
    founderId: string
    name: string
    role: string
    photoUrl?: string
}

export default function TeamCard({ founderId, name, role, photoUrl }: TeamCardProps) {
    return (
        <Link href={`/founder/${founderId}`} className={styles.card}>
            {photoUrl ? (
                <img src={photoUrl} alt={name} className={styles.photo} />
            ) : (
                <div className={styles.photoPlaceholder}>
                    <span className={styles.initials}>{name.charAt(0)}</span>
                </div>
            )}
            <div className={styles.info}>
                <h3 className={styles.name}>{name}</h3>
                <p className={styles.role}>{role}</p>
            </div>
        </Link>
    )
}
