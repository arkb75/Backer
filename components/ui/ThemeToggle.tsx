'use client'

import { useEffect, useState } from 'react'
import styles from './ThemeToggle.module.css'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('light')

    useEffect(() => {
        const current = document.documentElement.getAttribute('data-theme')
        const initial = current === 'dark' ? 'dark' : 'light'
        setTheme(initial)
    }, [])

    const toggleTheme = () => {
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
        setTheme(nextTheme)
        applyTheme(nextTheme)
    }

    const isDark = theme === 'dark'

    return (
        <button
            type="button"
            className={styles.toggle}
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
        </button>
    )
}
