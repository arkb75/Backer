'use client'

import styles from './Onboarding.module.css'

interface IndustryTagInputProps {
    selectedTags: string[]
    onChange: (tags: string[]) => void
}

const AVAILABLE_INDUSTRIES = [
    'AI/ML',
    'FinTech',
    'HealthTech',
    'SaaS',
    'E-commerce',
    'EdTech',
    'Climate Tech',
    'Web3/Crypto',
    'Consumer',
    'Enterprise',
    'Biotech',
    'Hardware',
    'Gaming',
    'PropTech',
    'FoodTech',
    'Marketplace',
    'DevTools',
    'Cybersecurity'
]

export default function IndustryTagInput({ selectedTags, onChange }: IndustryTagInputProps) {
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            onChange(selectedTags.filter(t => t !== tag))
        } else {
            if (selectedTags.length < 10) {
                onChange([...selectedTags, tag])
            }
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {AVAILABLE_INDUSTRIES.map(industry => {
                    const isSelected = selectedTags.includes(industry)
                    return (
                        <button
                            key={industry}
                            type="button"
                            onClick={() => toggleTag(industry)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: isSelected ? '2px solid #10a37f' : '1px solid var(--color-border)',
                                background: isSelected ? 'var(--color-success-bg)' : 'var(--color-surface)',
                                color: isSelected ? 'var(--color-success)' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: isSelected ? '600' : '400',
                                transition: 'all 0.2s'
                            }}
                        >
                            {industry}
                        </button>
                    )
                })}
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                Select up to 10 industries you&apos;re interested in ({selectedTags.length}/10)
            </p>
        </div>
    )
}
