'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ReelCard } from './ReelCard'
import styles from './ReelsFeed.module.css'

export interface FeedItem {
    id: string
    targetUrl: string
    name: string
    tagline: string
    description: string | null
    videoUrl: string
    logoUrl: string | null
    stage: string | null
    founders: {
        id: string
        name: string
        avatar: string | null
    }[]
}

interface ReelsFeedProps {
    items: FeedItem[]
}

export function ReelsFeed({ items }: ReelsFeedProps) {
    const router = useRouter()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [touchStart, setTouchStart] = useState(0)
    const [touchEnd, setTouchEnd] = useState(0)
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
    const [touchStartX, setTouchStartX] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const lastTapRef = useRef(0)

    const totalItems = items.length
    const currentItem = items[currentIndex]

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientY)
        setTouchStartX(e.touches[0].clientX)
        setSwipeDirection(null)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.touches[0].clientY)

        // Detect horizontal swipe direction
        const diffX = e.touches[0].clientX - touchStartX
        if (Math.abs(diffX) > 30) {
            setSwipeDirection(diffX > 0 ? 'right' : 'left')
        }
    }

    const handleTouchEnd = useCallback(() => {
        if (!touchStart || !touchEnd) return

        const distanceY = touchStart - touchEnd
        const isUpSwipe = distanceY > 50
        const isDownSwipe = distanceY < -50

        // Vertical swiping - loop infinitely through videos
        if (totalItems > 1 && isUpSwipe) {
            setCurrentIndex((prev) => (prev + 1) % totalItems)
        } else if (totalItems > 1 && isDownSwipe) {
            setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems)
        }

        // Horizontal swipe right - go to detail
        if (swipeDirection === 'right') {
            router.push(currentItem.targetUrl)
        }

        setTouchStart(0)
        setTouchEnd(0)
        setSwipeDirection(null)
    }, [touchStart, touchEnd, swipeDirection, currentItem?.targetUrl, router, totalItems])

    const handleDoubleTap = () => {
        const now = Date.now()
        const DOUBLE_TAP_DELAY = 300

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap - go to detail
            router.push(currentItem.targetUrl)
        }
        lastTapRef.current = now
    }

    // Keyboard navigation for testing
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp' && totalItems > 1) {
                setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems)
            } else if (e.key === 'ArrowDown' && totalItems > 1) {
                setCurrentIndex((prev) => (prev + 1) % totalItems)
            } else if (e.key === 'ArrowRight') {
                router.push(currentItem.targetUrl)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentItem?.targetUrl, router, totalItems])

    if (!currentItem) {
        return null
    }

    return (
        <div
            ref={containerRef}
            className={styles.container}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleDoubleTap}
        >
            <ReelCard item={currentItem} />

            {/* Instructions overlay */}
            <div className={styles.instructions}>
                <p>↑↓ Swipe to browse</p>
                <p>→ Swipe right or double tap for product details</p>
            </div>
        </div>
    )
}
