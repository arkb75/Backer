'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './InvestmentModal.module.css'

interface InvestmentModalProps {
    productId: string
    productName: string
    founderId: string
    askAmount?: number
    onClose: () => void
}

export default function InvestmentModal({
    productId,
    productName,
    founderId,
    askAmount,
    onClose,
}: InvestmentModalProps) {
    const router = useRouter()
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const amountNum = parseFloat(amount)
        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/investments/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    founderId,
                    amount: amountNum,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to commit investment')
            }

            setSuccess(true)

            // Wait a moment to show success, then navigate to messages
            setTimeout(() => {
                router.push(`/investor/messages/${data.conversation.id}`)
            }, 1500)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    return (
        <div className={styles.modal} onClick={handleBackdropClick}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Commit Investment</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className={styles.productInfo}>
                    <div className={styles.productName}>{productName}</div>
                    {askAmount && (
                        <div className={styles.askAmount}>
                            Seeking: ${askAmount.toLocaleString()}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            How much would you like to invest?
                        </label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.dollarSign}>$</span>
                            <input
                                type="number"
                                className={styles.input}
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={loading || success}
                                min="1"
                                step="1"
                            />
                        </div>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}
                    {success && (
                        <div className={styles.success}>
                            ✓ Investment committed! Redirecting to messages...
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={`${styles.button} ${styles.cancelButton}`}
                            onClick={onClose}
                            disabled={loading || success}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`${styles.button} ${styles.commitButton}`}
                            disabled={loading || success || !amount}
                        >
                            {loading ? 'Committing...' : success ? 'Committed!' : 'Commit Funds'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
