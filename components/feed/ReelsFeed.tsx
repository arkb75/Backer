'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ReelCard } from './ReelCard'
import styles from './ReelsFeed.module.css'

export interface FeedItem {
    id: string
    productId: string
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
    const supportsLooping = items.length > 1
    const virtualItems = useMemo(
        () => (supportsLooping ? [...items, ...items, ...items] : items),
        [items, supportsLooping]
    )
    const initialVirtualIndex = 0
    const [activeVirtualIndex, setActiveVirtualIndex] = useState(initialVirtualIndex)
    const containerRef = useRef<HTMLDivElement>(null)
    const paneRefs = useRef<Array<HTMLElement | null>>([])
    const isRecenteringRef = useRef(false)
    const touchStartRef = useRef<{ x: number; y: number } | null>(null)
    const lastTapRef = useRef(0)

    const getRealIndex = (index: number): number => {
        if (items.length === 0) return 0
        return ((index % items.length) + items.length) % items.length
    }

    const activeItem = items[getRealIndex(activeVirtualIndex)]

    useEffect(() => {
        if (!containerRef.current || virtualItems.length === 0) return
        paneRefs.current = paneRefs.current.slice(0, virtualItems.length)
        const startPane = paneRefs.current[initialVirtualIndex]
        if (startPane) {
            containerRef.current.scrollTo({ top: startPane.offsetTop, behavior: 'auto' })
        }
        setActiveVirtualIndex(initialVirtualIndex)
    }, [initialVirtualIndex, virtualItems.length])

    useEffect(() => {
        const root = containerRef.current
        if (!root || virtualItems.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (isRecenteringRef.current) return
                const mostVisible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
                if (!mostVisible) return

                const indexAttr = (mostVisible.target as HTMLElement).dataset.index
                const nextIndex = indexAttr ? Number.parseInt(indexAttr, 10) : NaN
                if (!Number.isNaN(nextIndex)) {
                    setActiveVirtualIndex(nextIndex)
                }
            },
            {
                root,
                threshold: [0.6, 0.75, 0.9],
            }
        )

        paneRefs.current.forEach((pane) => {
            if (pane) observer.observe(pane)
        })

        return () => observer.disconnect()
    }, [virtualItems.length])

    useEffect(() => {
        if (!supportsLooping || !containerRef.current || items.length === 0) return
        if (isRecenteringRef.current) return

        const crossedBottomBoundary = activeVirtualIndex >= items.length * 2
        if (!crossedBottomBoundary) return

        const normalized = getRealIndex(activeVirtualIndex)
        const recenteredIndex = items.length + normalized
        const pane = paneRefs.current[recenteredIndex]
        if (!pane) return

        isRecenteringRef.current = true
        containerRef.current.scrollTo({ top: pane.offsetTop, behavior: 'auto' })
        setActiveVirtualIndex(recenteredIndex)
        requestAnimationFrame(() => {
            isRecenteringRef.current = false
        })
    }, [activeVirtualIndex, items.length, supportsLooping])

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0]
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
        }
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        const start = touchStartRef.current
        const end = e.changedTouches[0]
        touchStartRef.current = null
        if (!start || !activeItem) return

        const deltaX = end.clientX - start.x
        const deltaY = end.clientY - start.y
        const isHorizontalSwipe = Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) + 20
        if (isHorizontalSwipe && deltaX > 0) {
            router.push(activeItem.targetUrl)
        }
    }

    const handleDoubleTap = () => {
        if (!activeItem) return
        const now = Date.now()
        const DOUBLE_TAP_DELAY = 300

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap - go to detail
            router.push(activeItem.targetUrl)
        }
        lastTapRef.current = now
    }

    // Keyboard navigation
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && activeItem) {
                router.push(activeItem.targetUrl)
                return
            }

            const viewportHeight = container.clientHeight
            if (e.key === 'ArrowDown') {
                container.scrollBy({ top: viewportHeight, behavior: 'smooth' })
            }
            if (e.key === 'ArrowUp') {
                container.scrollBy({ top: -viewportHeight, behavior: 'smooth' })
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeItem, router])

    if (virtualItems.length === 0) {
        return null
    }

    return (
        <div
            ref={containerRef}
            className={styles.container}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={handleDoubleTap}
        >
            {virtualItems.map((item, index) => {
                const isActive = index === activeVirtualIndex
                const shouldLoadLikeState = Math.abs(index - activeVirtualIndex) <= 1

                return (
                    <section
                        key={`${item.id}-${index}`}
                        ref={(node) => {
                            paneRefs.current[index] = node
                        }}
                        data-index={index}
                        className={styles.pane}
                    >
                        <ReelCard
                            item={item}
                            isActive={isActive}
                            shouldLoadLikeState={shouldLoadLikeState}
                        />
                    </section>
                )
            })}
        </div>
    )
}
