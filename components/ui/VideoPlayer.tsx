import type { Ref } from 'react'
import styles from './VideoPlayer.module.css'

interface VideoPlayerProps {
    videoUrl: string
    title?: string
    autoPlay?: boolean
    muted?: boolean
    loop?: boolean
    playsInline?: boolean
    showControls?: boolean
    containerRef?: Ref<HTMLDivElement>
    videoRef?: Ref<HTMLVideoElement>
}

export default function VideoPlayer({
    videoUrl,
    title,
    autoPlay = false,
    muted = false,
    loop = false,
    playsInline = false,
    showControls = true,
    containerRef,
    videoRef,
}: VideoPlayerProps) {
    return (
        <div ref={containerRef} className={styles.videoWrapper}>
            <video
                ref={videoRef}
                className={styles.video}
                controls={showControls}
                autoPlay={autoPlay}
                muted={muted}
                loop={loop}
                playsInline={playsInline}
                preload={autoPlay ? "auto" : "metadata"}
                aria-label={title || 'Video'}
            >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    )
}
