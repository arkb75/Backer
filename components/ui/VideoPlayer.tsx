import styles from './VideoPlayer.module.css'

interface VideoPlayerProps {
    videoUrl: string
    title?: string
}

export default function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
    return (
        <div className={styles.videoWrapper}>
            <video
                className={styles.video}
                controls
                preload="metadata"
                aria-label={title || 'Video'}
            >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    )
}
