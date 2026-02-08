'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './ProductActions.module.css'

interface ProductActionsProps {
    productId: string
    founderId: string
    isLiked?: boolean
    isCommitted?: boolean
    onLikeStateChange?: (state: { liked: boolean; likeCount: number }) => void
}

export default function ProductActions({
    productId,
    founderId,
    isLiked = false,
    isCommitted = false,
    onLikeStateChange,
}: ProductActionsProps) {
    const router = useRouter()
    const [liked, setLiked] = useState(isLiked || isCommitted)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleLike = async () => {
        if (loading) return

        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const response = await fetch(`/api/product/${productId}/like`, {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to like product')
            }

            const nextLiked = Boolean(data.liked)
            const nextLikeCount = typeof data.likeCount === 'number' ? data.likeCount : 0
            setLiked(nextLiked)
            onLikeStateChange?.({
                liked: nextLiked,
                likeCount: nextLikeCount,
            })
            setSuccess(
                nextLiked
                    ? 'You liked this startup! The founder can now message you.'
                    : 'You removed your like.'
            )
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleMessage = async () => {
        setLoading(true)
        setError(null)

        try {
            // Create or get existing conversation
            const response = await fetch('/api/messages/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    founderId,
                    productId,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start conversation')
            }

            // Navigate to the conversation
            router.push(`/investor/messages/${data.conversation.id}`)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <button
                className={`${styles.button} ${styles.likeButton} ${liked ? styles.liked : ''}`}
                onClick={handleLike}
                disabled={loading}
            >
                <span className={styles.icon}>{liked ? '💖' : '❤️'}</span>
                {loading ? 'Updating...' : liked ? 'Unlike This Startup' : 'Like This Startup'}
            </button>

            <button
                className={`${styles.button} ${styles.messageButton}`}
                onClick={handleMessage}
                disabled={loading}
            >
                <span className={styles.icon}>💬</span>
                Message Founder
            </button>

            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}
        </div>
    )
}
