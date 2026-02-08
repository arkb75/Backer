'use client'

import { useRef, useEffect, useState } from 'react'
import { Heart, User } from 'lucide-react'
import { FeedItem } from './ReelsFeed'
import styles from './ReelCard.module.css'

interface ReelCardProps {
    item: FeedItem
}

export function ReelCard({ item }: ReelCardProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [likeCount, setLikeCount] = useState(0)
    const [isLiked, setIsLiked] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [isLikeLoading, setIsLikeLoading] = useState(false)

    // Auto-play video when component mounts
    useEffect(() => {
        const video = videoRef.current
        if (video) {
            video.play().catch(() => {
                // Autoplay blocked - user needs to interact first
                setIsPaused(true)
            })
        }
    }, [item.id])

    useEffect(() => {
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
    }, [item.productId])

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
        if (isLikeLoading || isLiked) return

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
                        disabled={isLikeLoading || isLiked}
                        aria-label={isLiked ? 'Startup already liked' : 'Like startup'}
                    >
                        <Heart className={styles.actionIcon} fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
                    <span className={styles.actionCount}>{likeCount}</span>
                </div>
            </div>

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
