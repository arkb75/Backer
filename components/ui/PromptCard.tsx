import styles from './PromptCard.module.css'

interface PromptCardProps {
    prompt: string
    answer: string
}

export default function PromptCard({ prompt, answer }: PromptCardProps) {
    return (
        <div className={styles.card}>
            <p className={styles.prompt}>{prompt}</p>
            <p className={styles.answer}>{answer}</p>
        </div>
    )
}
