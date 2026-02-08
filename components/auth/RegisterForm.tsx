'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import styles from './AuthForm.module.css'

export default function RegisterForm() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [userType, setUserType] = useState<'FOUNDER' | 'INVESTOR'>('FOUNDER')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, userType }),
            })

            if (res.ok) {
                const signInResult = await signIn('credentials', {
                    email,
                    password,
                    redirect: false,
                })

                if (!signInResult?.error) {
                    if (userType === 'INVESTOR') {
                        router.push('/investor/onboarding')
                    } else {
                        router.push('/onboarding')
                    }
                    router.refresh()
                    return
                }

                router.push('/login?registered=true')
            } else {
                const data = await res.json()
                setError(data.error || 'Registration failed')
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

            <div className={styles.userTypeToggle}>
                <button
                    type="button"
                    className={`${styles.toggleOption} ${userType === 'FOUNDER' ? styles.active : ''}`}
                    onClick={() => setUserType('FOUNDER')}
                >
                    I'm a Founder
                </button>
                <button
                    type="button"
                    className={`${styles.toggleOption} ${userType === 'INVESTOR' ? styles.active : ''}`}
                    onClick={() => setUserType('INVESTOR')}
                >
                    I'm an Investor
                </button>
            </div>

            <div className={styles.inputGroup}>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className={styles.input}
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
                    minLength={8}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
            >
                {loading ? <span className={styles.spinner}></span> : 'Create account'}
            </button>

            <div className={styles.footer}>
                Already have an account?{' '}
                <Link href="/login" className={styles.link}>
                    Log in
                </Link>
            </div>
        </form>
    )
}
