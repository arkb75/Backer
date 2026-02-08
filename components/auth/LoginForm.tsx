'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './AuthForm.module.css'

interface LoginFormProps {
    lockedEmail?: string
}

export default function LoginForm({ lockedEmail }: LoginFormProps) {
    const router = useRouter()
    const [email, setEmail] = useState((lockedEmail || '').trim())
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const emailLocked = Boolean(lockedEmail?.trim())
    const registerHref = emailLocked
        ? `/register?inviteEmail=${encodeURIComponent((lockedEmail || '').trim())}`
        : "/register"

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError('Invalid email or password')
            } else {
                // Redirect to home page, which will handle routing based on user type and profile status
                router.push('/')
                router.refresh()
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.inputGroup}>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className={styles.input}
                    readOnly={emailLocked}
                />
            </div>

            <div className={styles.inputGroup}>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className={styles.input}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
            >
                {loading ? <span className={styles.spinner}></span> : 'Continue'}
            </button>

            <div className={styles.footer}>
                Don&apos;t have an account?{' '}
                <Link href={registerHref} className={styles.link}>
                    Sign up
                </Link>
            </div>
        </form>
    )
}
