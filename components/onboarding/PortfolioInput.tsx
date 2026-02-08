'use client'

import { useState } from 'react'
import styles from './Onboarding.module.css'

export interface PortfolioCompanyInput {
    name: string
    stage: string
    logoUrl?: string
}

interface PortfolioInputProps {
    companies: PortfolioCompanyInput[]
    onChange: (companies: PortfolioCompanyInput[]) => void
}

const INVESTMENT_STAGES = ['SEED', 'SERIES_A', 'SERIES_B', 'GROWTH']

export default function PortfolioInput({ companies, onChange }: PortfolioInputProps) {
    const [showForm, setShowForm] = useState(false)
    const [currentCompany, setCurrentCompany] = useState<PortfolioCompanyInput>({
        name: '',
        stage: 'SEED',
        logoUrl: ''
    })

    const handleAdd = () => {
        if (currentCompany.name.trim() && companies.length < 10) {
            onChange([...companies, {
                name: currentCompany.name.trim(),
                stage: currentCompany.stage,
                logoUrl: currentCompany.logoUrl?.trim() || undefined
            }])
            setCurrentCompany({ name: '', stage: 'SEED', logoUrl: '' })
            setShowForm(false)
        }
    }

    const handleRemove = (index: number) => {
        onChange(companies.filter((_, i) => i !== index))
    }

    return (
        <div>
            {/* Existing Companies */}
            {companies.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    {companies.map((company, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                border: '1px solid #e5e5e5',
                                borderRadius: '8px',
                                background: 'white'
                            }}
                        >
                            <div>
                                <p style={{ fontWeight: '600', marginBottom: '4px' }}>{company.name}</p>
                                <p style={{ fontSize: '14px', color: '#666' }}>{formatStage(company.stage)}</p>
                            </div>
                            <button
                                onClick={() => handleRemove(index)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#999',
                                    cursor: 'pointer',
                                    fontSize: '20px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Form */}
            {showForm ? (
                <div style={{ border: '1px solid #e5e5e5', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Company Name</label>
                        <input
                            value={currentCompany.name}
                            onChange={(e) => setCurrentCompany({ ...currentCompany, name: e.target.value })}
                            className={styles.input}
                            placeholder="e.g. Stripe"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Investment Stage</label>
                        <select
                            value={currentCompany.stage}
                            onChange={(e) => setCurrentCompany({ ...currentCompany, stage: e.target.value })}
                            className={styles.select}
                        >
                            {INVESTMENT_STAGES.map(stage => (
                                <option key={stage} value={stage}>{formatStage(stage)}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Logo URL (Optional)</label>
                        <input
                            value={currentCompany.logoUrl}
                            onChange={(e) => setCurrentCompany({ ...currentCompany, logoUrl: e.target.value })}
                            className={styles.input}
                            placeholder="https://..."
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleAdd}
                            disabled={!currentCompany.name.trim()}
                            style={{
                                padding: '8px 16px',
                                background: '#000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: currentCompany.name.trim() ? 'pointer' : 'not-allowed',
                                opacity: currentCompany.name.trim() ? 1 : 0.5
                            }}
                        >
                            Add
                        </button>
                        <button
                            onClick={() => {
                                setShowForm(false)
                                setCurrentCompany({ name: '', stage: 'SEED', logoUrl: '' })
                            }}
                            style={{
                                padding: '8px 16px',
                                background: '#f4f4f5',
                                color: '#333',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                companies.length < 10 && (
                    <button
                        onClick={() => setShowForm(true)}
                        className={styles.addPromptButton}
                    >
                        + Add Portfolio Company
                    </button>
                )
            )}

            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                Add companies you've invested in to build credibility ({companies.length}/10)
            </p>
        </div>
    )
}

function formatStage(stage: string): string {
    const stageMap: Record<string, string> = {
        SEED: 'Seed',
        SERIES_A: 'Series A',
        SERIES_B: 'Series B',
        GROWTH: 'Growth',
    }
    return stageMap[stage] || stage
}
