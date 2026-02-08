'use client'

import { useRouter } from 'next/navigation'
import styles from './BackButton.module.css'

interface BackButtonProps {
    href?: string
}

export default function BackButton({ href }: BackButtonProps) {
    const router = useRouter()

    return (
        <button
            onClick={() => {
                if (href) {
                    router.push(href)
                    return
                }
                router.back()
            }}
            className={styles.backButton}
            aria-label="Go back"
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    )
}
