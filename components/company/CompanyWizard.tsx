'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Company.module.css'

interface CompanyData {
    name: string
    tagline: string
    websiteUrl: string
    stage: string
    askAmount: string
    problem: string
    solution: string
    description: string
    logoUrl: string
    videoUrl: string
}

export default function CompanyWizard() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<CompanyData>({
        name: '',
        tagline: '',
        websiteUrl: '',
        stage: 'SEED',
        askAmount: '',
        problem: '',
        solution: '',
        description: '',
        logoUrl: '',
        videoUrl: ''
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'video') => {
        if (!e.target.files?.[0]) return

        const file = e.target.files[0]
        const data = new FormData()
        data.append('file', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: data
            })
            if (!res.ok) throw new Error('Upload failed')

            const { url } = await res.json()
            setFormData(prev => ({ ...prev, [type === 'logo' ? 'logoUrl' : 'videoUrl']: url }))
        } catch (err) {
            console.error(err)
            alert('Upload failed')
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) throw new Error('Failed to create company')

            const data = await res.json()
            // Redirect to profile or company page?
            // Usually profile shows the company now.
            // Or a generic "Success" -> Profile.
            router.push(`/founder/${data.founderProduct.founderId}`)
            router.refresh()
        } catch (err) {
            console.error(err)
            alert('Failed to create company')
        } finally {
            setLoading(false)
        }
    }

    const nextStep = () => setStep(s => s + 1)
    const prevStep = () => setStep(s => s - 1)

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Create Your Company</h1>
                <p className={styles.subtitle}>Tell investors what you're building</p>
            </div>

            <div className={styles.progress}>
                {[1, 2, 3].map(s => (
                    <div
                        key={s}
                        className={`${styles.stepIndicator} ${step >= s ? styles.active : ''}`}
                    />
                ))}
            </div>

            {/* Step 1: Basics */}
            {step === 1 && (
                <div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Company Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. Acme Corp"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>One-Line Tagline</label>
                        <input
                            name="tagline"
                            value={formData.tagline}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. The Operating System for Pizza Requirements"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Website (Optional)</label>
                        <input
                            name="websiteUrl"
                            value={formData.websiteUrl}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="https://..."
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Stage</label>
                            <select
                                name="stage"
                                value={formData.stage}
                                onChange={handleInputChange}
                                className={styles.select}
                            >
                                <option value="PRE_SEED">Pre-Seed</option>
                                <option value="SEED">Seed</option>
                                <option value="SERIES_A">Series A</option>
                            </select>
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Ask Amount ($)</label>
                            <input
                                name="askAmount"
                                type="number"
                                value={formData.askAmount}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="e.g. 1000000"
                            />
                        </div>
                    </div>

                    <div className={styles.buttonGroup}>
                        <button disabled className={styles.button} style={{ opacity: 0 }}>Back</button>
                        <button onClick={nextStep} className={`${styles.button} ${styles.nextButton}`}>
                            Next Step
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: The Pitch */}
            {step === 2 && (
                <div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>The Problem</label>
                        <textarea
                            name="problem"
                            value={formData.problem}
                            onChange={handleInputChange}
                            className={styles.textarea}
                            placeholder="What problem are you solving? Keep it punchy."
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>The Solution</label>
                        <textarea
                            name="solution"
                            value={formData.solution}
                            onChange={handleInputChange}
                            className={styles.textarea}
                            placeholder="How do you solve it?"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Full Description / Memo</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className={styles.textarea}
                            style={{ minHeight: '200px' }}
                            placeholder="Detailed description for investors who want to dig deeper."
                        />
                    </div>

                    <div className={styles.buttonGroup}>
                        <button onClick={prevStep} className={`${styles.button} ${styles.backButton}`}>
                            Back
                        </button>
                        <button onClick={nextStep} className={`${styles.button} ${styles.nextButton}`}>
                            Next Step
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Media */}
            {step === 3 && (
                <div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Company Logo</label>
                        <div className={styles.fileInputWrapper}>
                            {formData.logoUrl && (
                                <img src={formData.logoUrl} alt="Logo" className={styles.previewImage} />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'logo')}
                                style={{ display: 'block', margin: '0 auto' }}
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Demo Video (Optional)</label>
                        <div className={styles.fileInputWrapper}>
                            {formData.videoUrl && (
                                <video src={formData.videoUrl} controls style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '12px' }} />
                            )}
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleFileChange(e, 'video')}
                                style={{ display: 'block', margin: '0 auto' }}
                            />
                        </div>
                    </div>

                    <div className={styles.buttonGroup}>
                        <button onClick={prevStep} className={`${styles.button} ${styles.backButton}`}>
                            Back
                        </button>
                        <button onClick={handleSubmit} disabled={loading} className={`${styles.button} ${styles.nextButton}`}>
                            {loading ? 'Creating...' : 'Launch Company 🚀'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
