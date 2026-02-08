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
    const [isLiked, setIsLiked] = useState(false)
    const [isPaused, setIsPaused] = useState(false)

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
        setIsLiked(!isLiked)
        // TODO: Persist like to database
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
                <button
                    className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`}
                    onClick={handleLikeClick}
                >
                    <Heart className={styles.actionIcon} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
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
