import styles from './loading.module.css'

export default function Loading() {
    return (
        <div className={styles.container}>
            <div className={styles.feed}>
                {/* Profile photo skeleton */}
                <div className={`${styles.card} ${styles.photoCard}`}>
                    <div className={styles.skeleton} />
                </div>

                {/* Info card skeleton */}
                <div className={styles.card}>
                    <div className={`${styles.skeleton} ${styles.title}`} />
                    <div className={`${styles.skeleton} ${styles.subtitle}`} />
                    <div className={styles.quickInfo}>
                        <div className={`${styles.skeleton} ${styles.tag}`} />
                        <div className={`${styles.skeleton} ${styles.tag}`} />
                    </div>
                </div>

                {/* Thesis card skeleton */}
                <div className={`${styles.card} ${styles.thesisCard}`}>
                    <div className={`${styles.skeleton} ${styles.label}`} />
                    <div className={`${styles.skeleton} ${styles.text}`} />
                    <div className={`${styles.skeleton} ${styles.text}`} />
                    <div className={`${styles.skeleton} ${styles.textShort}`} />
                </div>

                {/* Portfolio section skeleton */}
                <div className={styles.card}>
                    <div className={`${styles.skeleton} ${styles.sectionTitle}`} />
                    <div className={styles.grid}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className={styles.portfolioCard}>
                                <div className={`${styles.skeleton} ${styles.logo}`} />
                                <div className={`${styles.skeleton} ${styles.companyName}`} />
                                <div className={`${styles.skeleton} ${styles.stage}`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
