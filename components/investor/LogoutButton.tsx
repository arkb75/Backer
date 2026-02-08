'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import styles from './LogoutButton.module.css'

export function LogoutButton() {
    const handleLogout = async () => {
        await signOut({ callbackUrl: '/login' })
    }

    return (
        <button
            onClick={handleLogout}
            className={styles.logoutButton}
            aria-label="Logout"
        >
            <LogOut size={20} />
            <span>Logout</span>
        </button>
    )
}
