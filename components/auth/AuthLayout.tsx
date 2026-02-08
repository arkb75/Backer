import React from 'react'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
    children: React.ReactNode
    title?: string
    subtitle?: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    {/* Logo Placeholder */}
                    <div className={styles.logo}>Backer</div>
                    {title && <h1 className={styles.title}>{title}</h1>}
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    )
}
