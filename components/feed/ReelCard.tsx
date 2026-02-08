'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, HandCoins, User } from 'lucide-react'
import { FeedItem } from './ReelsFeed'
import styles from './ReelCard.module.css'

interface ReelCardProps {
    item: FeedItem
    isActive?: boolean
    shouldLoadLikeState?: boolean
}

export function ReelCard({
    item,
    isActive = true,
    shouldLoadLikeState = true,
}: ReelCardProps) {
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)
    const [likeCount, setLikeCount] = useState(0)
    const [isLiked, setIsLiked] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [isLikeLoading, setIsLikeLoading] = useState(false)
    const [isMessageLoading, setIsMessageLoading] = useState(false)
    const [isFundLoading, setIsFundLoading] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [actionSuccess, setActionSuccess] = useState<string | null>(null)
    const [isFundModalOpen, setIsFundModalOpen] = useState(false)
    const [fundAmountInput, setFundAmountInput] = useState('25000')
    const [fundFormError, setFundFormError] = useState<string | null>(null)

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        if (!isActive) {
            video.pause()
            return
        }

        video.play().then(() => {
            setIsPaused(false)
        }).catch(() => {
            // Autoplay blocked - user needs to interact first
            setIsPaused(true)
        })
    }, [isActive, item.id])

    useEffect(() => {
        if (!shouldLoadLikeState) return

        let active = true

        const loadLikeState = async () => {
            try {
                const res = await fetch(`/api/product/${item.productId}/like`, {
                    method: 'GET',
                    cache: 'no-store',
                })

                if (!res.ok) return
                const data = await res.json() as { likeCount?: number; liked?: boolean }
                if (!active) return

                setLikeCount(typeof data.likeCount === 'number' ? data.likeCount : 0)
                setIsLiked(Boolean(data.liked))
            } catch (error) {
                // Keep feed usable even if like API fails.
                if (!active) return
                setLikeCount(0)
                setIsLiked(false)
            }
        }

        void loadLikeState()

        return () => {
            active = false
        }
    }, [item.productId, shouldLoadLikeState])

    useEffect(() => {
        if (!isFundModalOpen) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isFundLoading) {
                setIsFundModalOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isFundLoading, isFundModalOpen])

    const handleVideoClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        const video = videoRef.current
        if (video) {
            if (video.paused) {
                video.play()
                setIsPaused(false)
            } else {
                video.pause()
                setIsPaused(true)
            }
        }
    }

    const handleLikeClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isLikeLoading) return

        const toggleLike = async () => {
            setIsLikeLoading(true)

            try {
                const res = await fetch(`/api/product/${item.productId}/like`, {
                    method: 'POST',
                })

                if (!res.ok) return
                const data = await res.json() as { likeCount?: number; liked?: boolean }
                setLikeCount(typeof data.likeCount === 'number' ? data.likeCount : 0)
                setIsLiked(Boolean(data.liked))
            } finally {
                setIsLikeLoading(false)
            }
        }

        void toggleLike()
    }

    const handleMessageClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isMessageLoading) return

        const founderId = item.founders[0]?.id
        if (!founderId) {
            setActionSuccess(null)
            setActionError('No founder linked to this startup yet.')
            return
        }

        const startConversation = async () => {
            setIsMessageLoading(true)
            setActionError(null)
            setActionSuccess(null)

            try {
                const res = await fetch('/api/messages/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        founderId,
                        productId: item.productId,
                    }),
                })

                const data = await res.json().catch(() => null) as
                    | { conversation?: { id?: string }; error?: string }
                    | null
                const conversationId = data?.conversation?.id
                if (!res.ok || !conversationId) {
                    throw new Error(data?.error || 'Failed to start conversation')
                }

                router.push(`/investor/messages/${conversationId}`)
            } catch (error) {
                setActionSuccess(null)
                setActionError(error instanceof Error ? error.message : 'Failed to start conversation')
            } finally {
                setIsMessageLoading(false)
            }
        }

        void startConversation()
    }

    const handleFundClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isFundLoading) return
        setFundFormError(null)
        setIsFundModalOpen(true)
    }

    const handleFundSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (isFundLoading) return

        const parsedAmount = Number.parseFloat(fundAmountInput.replace(/[^0-9.]/g, ''))
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setFundFormError('Enter a valid funding amount.')
            return
        }

        const roundedAmount = Math.round(parsedAmount)

        const fundStartup = async () => {
            setIsFundLoading(true)
            setFundFormError(null)
            setActionError(null)
            setActionSuccess(null)

            try {
                const res = await fetch('/api/interest/like', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: item.productId,
                        interestType: 'COMMITTED',
                        amountCommitted: roundedAmount,
                    }),
                })

                const data = await res.json().catch(() => null) as
                    | { error?: string }
                    | null
                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to commit funding')
                }

                if (!isLiked) {
                    setLikeCount((prev) => prev + 1)
                }
                setIsLiked(true)
                setIsFundModalOpen(false)
                setActionSuccess(`Committed $${roundedAmount.toLocaleString()} successfully.`)
            } catch (error) {
                setActionSuccess(null)
                setFundFormError(error instanceof Error ? error.message : 'Failed to commit funding')
            } finally {
                setIsFundLoading(false)
            }
        }

        void fundStartup()
    }

    return (
        <div className={styles.card}>
            {/* Video Player */}
            <video
                ref={videoRef}
                className={styles.video}
                src={item.videoUrl}
                loop
                muted
                playsInline
                preload={isActive ? 'auto' : 'metadata'}
                onClick={handleVideoClick}
                poster={item.logoUrl || undefined}
            />

            {/* Pause indicator */}
            {isPaused && (
                <div className={styles.pauseOverlay}>
                    <div className={styles.playButton}>▶</div>
                </div>
            )}

            {/* Gradient overlay */}
            <div className={styles.gradient} />

            {/* Right side actions */}
            <div className={styles.actions}>
                <div className={styles.actionItem}>
                    <button
                        className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`}
                        onClick={handleLikeClick}
                        disabled={isLikeLoading}
                        aria-label={isLiked ? 'Unlike startup' : 'Like startup'}
                    >
                        <Heart className={styles.actionIcon} fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
                    <span className={styles.actionCount}>{likeCount}</span>
                </div>

                <div className={styles.actionItem}>
                    <button
                        className={`${styles.actionButton} ${styles.messageButton}`}
                        onClick={handleMessageClick}
                        disabled={isMessageLoading}
                        aria-label="Message founder"
                    >
                        <MessageCircle className={styles.actionIcon} />
                    </button>
                    <span className={styles.actionLabel}>
                        {isMessageLoading ? 'Opening...' : 'Message'}
                    </span>
                </div>

                <div className={styles.actionItem}>
                    <button
                        className={`${styles.actionButton} ${styles.fundButton}`}
                        onClick={handleFundClick}
                        disabled={isFundLoading}
                        aria-label="Fund startup"
                    >
                        <HandCoins className={styles.actionIcon} />
                    </button>
                    <span className={styles.actionLabel}>
                        {isFundLoading ? 'Funding...' : 'Fund'}
                    </span>
                </div>
            </div>

            {(actionError || actionSuccess) && (
                <p
                    className={`${styles.actionFeedback} ${actionError ? styles.actionError : styles.actionSuccess}`}
                    role="status"
                >
                    {actionError || actionSuccess}
                </p>
            )}

            {isFundModalOpen && (
                <div
                    className={styles.modalBackdrop}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (!isFundLoading) {
                            setIsFundModalOpen(false)
                        }
                    }}
                    role="presentation"
                >
                    <div
                        className={styles.modal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`fund-title-${item.id}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className={styles.modalTitle} id={`fund-title-${item.id}`}>Fund {item.name}</h3>
                        <p className={styles.modalSubtitle}>Enter your commitment amount in USD.</p>

                        <form className={styles.modalForm} onSubmit={handleFundSubmit}>
                            <label className={styles.modalLabel} htmlFor={`fund-amount-${item.id}`}>
                                Amount
                            </label>
                            <input
                                id={`fund-amount-${item.id}`}
                                className={styles.modalInput}
                                type="text"
                                inputMode="decimal"
                                value={fundAmountInput}
                                onChange={(e) => setFundAmountInput(e.target.value)}
                                placeholder="25000"
                                autoFocus
                                disabled={isFundLoading}
                            />
                            {fundFormError && <p className={styles.modalError}>{fundFormError}</p>}
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.modalCancel}
                                    onClick={() => setIsFundModalOpen(false)}
                                    disabled={isFundLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.modalSubmit}
                                    disabled={isFundLoading}
                                >
                                    {isFundLoading ? 'Funding...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bottom info overlay */}
            <div className={styles.info}>
                <h2 className={styles.name}>{item.name}</h2>
                <p className={styles.tagline}>{item.tagline}</p>

                {/* Founders */}
                {item.founders.length > 0 && (
                    <div className={styles.founders}>
                        <div className={styles.avatars}>
                            {item.founders.map((founder, idx) => (
                                founder.avatar ? (
                                    <img
                                        key={founder.id}
                                        src={founder.avatar}
                                        alt={founder.name}
                                        className={styles.avatar}
                                        style={{ zIndex: item.founders.length - idx }}
                                    />
                                ) : (
                                    <div
                                        key={founder.id}
                                        className={styles.avatarPlaceholder}
                                        style={{ zIndex: item.founders.length - idx }}
                                    >
                                        <User size={14} />
                                    </div>
                                )
                            ))}
                        </div>
                        <div className={styles.founderInfo}>
                            <p className={styles.founderNames}>
                                {item.founders.map(f => f.name).join(', ')}
                            </p>
                            {item.stage && (
                                <p className={styles.stage}>{item.stage}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
