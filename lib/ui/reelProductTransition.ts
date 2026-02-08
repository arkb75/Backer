type ReelTransitionSnapshot = {
    version: 1
    targetPath: string
    videoSrc: string
    currentTime: number
    playbackRate: number
    wasPlaying: boolean
    createdAt: number
}

interface StartReelToProductTransitionInput {
    sourceVideo: HTMLVideoElement | null
    fallbackVideoUrl: string
    targetUrl: string
    navigate: (targetUrl: string) => void
}

interface FinishReelToProductTransitionInput {
    targetContainer: HTMLElement | null
    targetVideo: HTMLVideoElement | null
}

const SNAPSHOT_KEY = 'backer.reel-product-transition'
const OVERLAY_ID = 'backer-reel-product-transition-overlay'
const SNAPSHOT_TTL_MS = 15_000
const NAVIGATION_DELAY_MS = 95
const LIFT_DURATION_MS = 420
const SETTLE_DURATION_MS = 360

let cleanupTimer: number | null = null
let transitionInProgress = false

const isFiniteNumber = (value: number): boolean => Number.isFinite(value)

const clampToNonNegative = (value: number): number => (value < 0 ? 0 : value)

const toAbsolutePath = (targetUrl: string): string => {
    if (typeof window === 'undefined') return targetUrl
    try {
        return new URL(targetUrl, window.location.origin).pathname
    } catch {
        return targetUrl.split('?')[0]?.split('#')[0] || targetUrl
    }
}

const clearTimer = () => {
    if (cleanupTimer !== null) {
        window.clearTimeout(cleanupTimer)
        cleanupTimer = null
    }
}

const clearSnapshot = () => {
    try {
        window.sessionStorage.removeItem(SNAPSHOT_KEY)
    } catch {
        // Ignore storage errors.
    }
}

const clearOverlay = () => {
    const overlay = window.document.getElementById(OVERLAY_ID)
    if (overlay) {
        overlay.remove()
    }
}

const clearTransitionState = (options?: { keepSnapshot?: boolean }) => {
    clearTimer()
    clearOverlay()
    if (!options?.keepSnapshot) {
        clearSnapshot()
    }
    transitionInProgress = false
}

const readSnapshot = (): ReelTransitionSnapshot | null => {
    try {
        const raw = window.sessionStorage.getItem(SNAPSHOT_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<ReelTransitionSnapshot>
        if (parsed.version !== 1) return null
        if (typeof parsed.targetPath !== 'string') return null
        if (typeof parsed.videoSrc !== 'string') return null
        if (typeof parsed.currentTime !== 'number') return null
        if (typeof parsed.playbackRate !== 'number') return null
        if (typeof parsed.wasPlaying !== 'boolean') return null
        if (typeof parsed.createdAt !== 'number') return null
        if (Date.now() - parsed.createdAt > SNAPSHOT_TTL_MS) return null

        return {
            version: 1,
            targetPath: parsed.targetPath,
            videoSrc: parsed.videoSrc,
            currentTime: parsed.currentTime,
            playbackRate: parsed.playbackRate,
            wasPlaying: parsed.wasPlaying,
            createdAt: parsed.createdAt,
        }
    } catch {
        return null
    }
}

const writeSnapshot = (snapshot: ReelTransitionSnapshot) => {
    try {
        window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
    } catch {
        // Ignore storage errors.
    }
}

const syncVideoTime = (video: HTMLVideoElement, currentTime: number, playbackRate: number) => {
    const apply = () => {
        if (isFiniteNumber(currentTime)) {
            try {
                video.currentTime = clampToNonNegative(currentTime)
            } catch {
                // Some browsers reject seeks until metadata is ready.
            }
        }
        if (isFiniteNumber(playbackRate) && playbackRate > 0) {
            video.playbackRate = playbackRate
        }
    }

    if (video.readyState >= 1) {
        apply()
        return
    }

    video.addEventListener('loadedmetadata', apply, { once: true })
}

export function startReelToProductTransition({
    sourceVideo,
    fallbackVideoUrl,
    targetUrl,
    navigate,
}: StartReelToProductTransitionInput) {
    if (typeof window === 'undefined') {
        navigate(targetUrl)
        return
    }

    if (transitionInProgress) return
    transitionInProgress = true

    clearTimer()
    clearOverlay()

    const videoSrc = sourceVideo?.currentSrc || sourceVideo?.src || fallbackVideoUrl
    if (!videoSrc) {
        transitionInProgress = false
        navigate(targetUrl)
        return
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const sourceRect = sourceVideo?.getBoundingClientRect() ?? null
    const initialTop = clampToNonNegative(sourceRect?.top ?? 0)
    const initialLeft = clampToNonNegative(sourceRect?.left ?? 0)
    const initialWidth = sourceRect?.width && sourceRect.width > 0 ? sourceRect.width : viewportWidth
    const initialHeight = sourceRect?.height && sourceRect.height > 0 ? sourceRect.height : viewportHeight
    const initialRadius = sourceVideo ? window.getComputedStyle(sourceVideo).borderRadius : '0px'
    const currentTime = sourceVideo && isFiniteNumber(sourceVideo.currentTime) ? sourceVideo.currentTime : 0
    const playbackRate = sourceVideo && isFiniteNumber(sourceVideo.playbackRate) ? sourceVideo.playbackRate : 1
    const wasPlaying = sourceVideo ? !sourceVideo.paused : true

    writeSnapshot({
        version: 1,
        targetPath: toAbsolutePath(targetUrl),
        videoSrc,
        currentTime,
        playbackRate,
        wasPlaying,
        createdAt: Date.now(),
    })

    const overlay = window.document.createElement('div')
    overlay.id = OVERLAY_ID
    overlay.style.position = 'fixed'
    overlay.style.top = `${Math.round(initialTop)}px`
    overlay.style.left = `${Math.round(initialLeft)}px`
    overlay.style.width = `${Math.round(initialWidth)}px`
    overlay.style.height = `${Math.round(initialHeight)}px`
    overlay.style.borderRadius = initialRadius || '0px'
    overlay.style.background = '#000'
    overlay.style.overflow = 'hidden'
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '2147483000'
    overlay.style.willChange = 'top,left,width,height,border-radius,opacity'
    overlay.style.transition = [
        `top ${LIFT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        `left ${LIFT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        `width ${LIFT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        `height ${LIFT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        `border-radius ${LIFT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        `opacity ${LIFT_DURATION_MS}ms ease`,
    ].join(', ')

    const transitionVideo = window.document.createElement('video')
    transitionVideo.src = videoSrc
    transitionVideo.muted = true
    transitionVideo.playsInline = true
    transitionVideo.autoplay = true
    transitionVideo.loop = true
    transitionVideo.preload = 'auto'
    transitionVideo.style.width = '100%'
    transitionVideo.style.height = '100%'
    transitionVideo.style.objectFit = 'cover'
    transitionVideo.style.display = 'block'

    syncVideoTime(transitionVideo, currentTime, playbackRate)
    if (wasPlaying) {
        void transitionVideo.play().catch(() => {
            // Ignore autoplay errors; visual transition still works.
        })
    }

    overlay.appendChild(transitionVideo)
    window.document.body.appendChild(overlay)

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            overlay.style.top = '0px'
            overlay.style.left = '0px'
            overlay.style.width = `${viewportWidth}px`
            overlay.style.height = `${viewportHeight}px`
            overlay.style.borderRadius = '0px'
        })
    })

    window.setTimeout(() => {
        navigate(targetUrl)
    }, NAVIGATION_DELAY_MS)

    cleanupTimer = window.setTimeout(() => {
        clearTransitionState()
    }, SNAPSHOT_TTL_MS)
}

export function finishReelToProductTransition({
    targetContainer,
    targetVideo,
}: FinishReelToProductTransitionInput) {
    if (typeof window === 'undefined') return

    const snapshot = readSnapshot()
    if (!snapshot) {
        clearTransitionState()
        return
    }

    if (snapshot.targetPath !== window.location.pathname) {
        clearTransitionState()
        return
    }

    if (targetVideo) {
        const elapsedSeconds = snapshot.wasPlaying
            ? Math.max(0, Date.now() - snapshot.createdAt) / 1000
            : 0
        const syncedTime = snapshot.currentTime + elapsedSeconds * snapshot.playbackRate
        syncVideoTime(targetVideo, syncedTime, snapshot.playbackRate)
        if (snapshot.wasPlaying) {
            void targetVideo.play().catch(() => {
                // Ignore autoplay errors and allow user-initiated playback.
            })
        }
    }

    const overlay = window.document.getElementById(OVERLAY_ID)
    if (!overlay || !targetContainer) {
        clearTransitionState()
        return
    }

    let tries = 0
    const maxTries = 8

    const settleToTarget = () => {
        const rect = targetContainer.getBoundingClientRect()
        if ((rect.width < 1 || rect.height < 1) && tries < maxTries) {
            tries += 1
            window.requestAnimationFrame(settleToTarget)
            return
        }

        const radius = window.getComputedStyle(targetContainer).borderRadius || '0px'
        if (targetVideo) {
            targetVideo.style.opacity = '0'
            targetVideo.style.transition = `opacity ${SETTLE_DURATION_MS}ms ease`
        }

        overlay.style.transition = [
            `top ${SETTLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            `left ${SETTLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            `width ${SETTLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            `height ${SETTLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            `border-radius ${SETTLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            `opacity ${SETTLE_DURATION_MS}ms ease`,
        ].join(', ')

        overlay.style.top = `${Math.round(clampToNonNegative(rect.top))}px`
        overlay.style.left = `${Math.round(clampToNonNegative(rect.left))}px`
        overlay.style.width = `${Math.round(rect.width)}px`
        overlay.style.height = `${Math.round(rect.height)}px`
        overlay.style.borderRadius = radius
        overlay.style.opacity = '0'

        if (targetVideo) {
            window.requestAnimationFrame(() => {
                targetVideo.style.opacity = '1'
            })
        }

        let finished = false
        const finalize = () => {
            if (finished) return
            finished = true
            clearTransitionState()
            if (targetVideo) {
                targetVideo.style.removeProperty('opacity')
                targetVideo.style.removeProperty('transition')
            }
        }

        const fallback = window.setTimeout(finalize, SETTLE_DURATION_MS + 140)
        overlay.addEventListener(
            'transitionend',
            () => {
                window.clearTimeout(fallback)
                finalize()
            },
            { once: true }
        )
    }

    window.requestAnimationFrame(settleToTarget)
}
