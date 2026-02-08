import type { ProductRecord } from '@/lib/db/types'
import styles from './ProductCard.module.css'
import Link from 'next/link'

interface ProductCardProps {
    product: ProductRecord
    role: string
    isPrimary: boolean
}

export default function ProductCard({ product, role, isPrimary }: ProductCardProps) {
    return (
        <Link href={`/product/${product.id}`} className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.name}>{product.name}</h3>
                {isPrimary && <span className={styles.primaryBadge}>Featured</span>}
            </div>
            <p className={styles.tagline}>{product.tagline}</p>
            <div className={styles.meta}>
                <span className={styles.role}>{role}</span>
                <span className={styles.status}>{formatStatus(product.status)}</span>
            </div>
        </Link>
    )
}

function formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
        IDEA: '💡 Idea',
        BUILDING: '🔨 Building',
        LAUNCHED: '🚀 Launched',
        RAISING: '📈 Raising',
        FUNDED: '✅ Funded',
    }
    return statusMap[status] || status
}
