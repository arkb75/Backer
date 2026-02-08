'use client'

import styles from './Onboarding.module.css'

export interface PromptItem {
    prompt: string
    answer: string
}

interface PromptSelectorProps {
    prompts: PromptItem[]
    onChange: (prompts: PromptItem[]) => void
}

const AVAILABLE_PROMPTS = [
    "I'm looking for a co-founder who...",
    "My superpower is...",
    "The biggest risk I ever took was...",
    "I geek out on...",
    "My ideal weekend is...",
    "A non-negotiable for me is...",
    "My favorite failure was...",
    "I'm obsessed with...",
    "The best advice I ever received...",
    "My most controversial opinion is..."
]

export default function PromptSelector({ prompts, onChange }: PromptSelectorProps) {

    const handlePromptChange = (index: number, field: keyof PromptItem, value: string) => {
        const newPrompts = [...prompts]
        newPrompts[index] = { ...newPrompts[index], [field]: value }
        onChange(newPrompts)
    }

    const addPrompt = () => {
        if (prompts.length < 3) {
            onChange([...prompts, { prompt: AVAILABLE_PROMPTS[0], answer: '' }])
        }
    }

    const removePrompt = (index: number) => {
        onChange(prompts.filter((_, i) => i !== index))
    }

    return (
        <div className={styles.promptsContainer}>
            {prompts.map((item, index) => (
                <div key={index} className={styles.promptCard}>
                    <div className={styles.promptHeader}>
                        <select
                            value={item.prompt}
                            onChange={(e) => handlePromptChange(index, 'prompt', e.target.value)}
                            className={styles.promptSelect}
                        >
                            {AVAILABLE_PROMPTS.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => removePrompt(index)}
                            className={styles.promptRemove}
                        >
                            ×
                        </button>
                    </div>
                    <textarea
                        value={item.answer}
                        onChange={(e) => handlePromptChange(index, 'answer', e.target.value)}
                        placeholder="Type your answer..."
                        className={styles.promptAnswer}
                        rows={3}
                    />
                </div>
            ))}

            {prompts.length < 3 && (
                <button type="button" onClick={addPrompt} className={styles.addPromptButton}>
                    + Add a Prompt
                </button>
            )}

            <p className={styles.promptHint}>
                Select prompts that help investors understand how you think.
            </p>
        </div>
    )
}
