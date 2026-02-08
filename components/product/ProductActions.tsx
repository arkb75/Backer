'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import InvestmentModal from '../investment/InvestmentModal'
import styles from './ProductActions.module.css'

interface ProductActionsProps {
    productId: string
    productName: string
    founderId: string
    askAmount?: number
    isLiked?: boolean
    isCommitted?: boolean
}

export default function ProductActions({
    productId,
    productName,
    founderId,
    askAmount,
    isLiked = false,
    isCommitted = false,
}: ProductActionsProps) {
    const router = useRouter()
    const [liked, setLiked] = useState(isLiked || isCommitted)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [showInvestModal, setShowInvestModal] = useState(false)

    const handleLike = async () => {
        if (liked || loading) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/interest/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    interestType: 'LIKED',
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to like product')
            }

            setLiked(true)
            setSuccess('You liked this startup! The founder can now message you.')
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
        <>
            <div className={styles.container}>
                <button
                    className={`${styles.button} ${styles.likeButton} ${liked ? styles.liked : ''}`}
                    onClick={handleLike}
                    disabled={liked || loading}
                >
                    <span className={styles.icon}>{liked ? '💖' : '❤️'}</span>
                    {liked ? 'Liked!' : 'Like This Startup'}
                </button>

                <button
                    className={`${styles.button} ${styles.commitButton}`}
                    onClick={() => setShowInvestModal(true)}
                    disabled={loading}
                >
                    <span className={styles.icon}>💰</span>
                    Invest
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

            {showInvestModal && (
                <InvestmentModal
                    productId={productId}
                    productName={productName}
                    founderId={founderId}
                    askAmount={askAmount}
                    onClose={() => setShowInvestModal(false)}
                />
            )}
        </>
    )
}
