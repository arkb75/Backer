import styles from './FounderVideo.module.css'

interface FounderVideoProps {
    videoUrl: string
    founderName: string
}

export default function FounderVideo({ videoUrl, founderName }: FounderVideoProps) {
    return (
        <div className={styles.videoWrapper}>
            <video
                className={styles.video}
                controls
                preload="metadata"
                aria-label={`Introduction video for ${founderName}`}
            >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    )
}
