'use client'

import { signOut } from "next-auth/react"
import styles from "./FounderProfile.module.css"

export default function FounderControls() {
    return (
        <div className={styles.controls}>
            <button
                className={styles.controlButton}
                onClick={() => signOut({ callbackUrl: '/' })}
            >
                <span>Sign Out</span>
            </button>
        </div>
    )
}
