'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Onboarding.module.css'
import IndustryTagInput from './IndustryTagInput'
import PortfolioInput, { PortfolioCompanyInput } from './PortfolioInput'

export default function InvestorOnboardingWizard() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        firmName: '',
        title: '',
        location: '',
        bio: '',
        profileImage: '',
        investmentStagePreference: 'SEED',
        interestTags: [] as string[],
        portfolio: [] as PortfolioCompanyInput[],
        linkedinUrl: '',
        twitterUrl: '',
        websiteUrl: ''
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            alert("Please enter your name.")
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/onboarding/investor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                const data = await res.json()
                router.push(`/investor/${data.id}`)
            } else {
                const errData = await res.json()
                alert(`Failed to create profile: ${errData.error || 'Unknown error'}`)
            }
        } catch (err) {
            console.error(err)
            alert('An error occurred.')
        } finally {
            setLoading(false)
        }
    }

    const nextStep = () => setStep(prev => prev + 1)
    const prevStep = () => setStep(prev => prev - 1)

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>
                    {step === 1 && 'The Basics'}
                    {step === 2 && 'Investment Focus'}
                    {step === 3 && 'Track Record'}
                </h1>
                <p className={styles.subtitle}>
                    {step === 1 && 'Let\'s start with the essentials.'}
                    {step === 2 && 'Tell founders what you\'re looking for.'}
                    {step === 3 && 'Show off your investments.'}
                </p>
            </div>

            {/* Progress */}
            <div className={styles.progress}>
                <div className={`${styles.stepIndicator} ${step >= 1 ? styles.active : ''}`} />
                <div className={`${styles.stepIndicator} ${step >= 2 ? styles.active : ''}`} />
                <div className={`${styles.stepIndicator} ${step >= 3 ? styles.active : ''}`} />
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
                <div className={styles.step}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Full Name *</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. Jane Smith"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Firm Name (Optional)</label>
                        <input
                            name="firmName"
                            value={formData.firmName}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. Sequoia Capital"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Title (Optional)</label>
                        <input
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. Partner, Angel Investor"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Location (Optional)</label>
                        <input
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. San Francisco, CA"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Bio (Optional)</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleInputChange}
                            className={styles.textarea}
                            placeholder="Share your investment thesis and what you're looking for..."
                        />
                    </div>
                </div>
            )}

            {/* Step 2: Investment Focus */}
            {step === 2 && (
                <div className={styles.step}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Profile Photo (Optional)</label>
                        {!formData.profileImage ? (
                            <div className={styles.fileUploadWrapper}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return

                                        try {
                                            const body = new FormData()
                                            body.append("file", file)
                                            const res = await fetch("/api/upload", { method: "POST", body })
                                            if (!res.ok) throw new Error("Upload failed")
                                            const data = await res.json()
                                            setFormData(prev => ({ ...prev, profileImage: data.url }))
                                        } catch (err) {
                                            alert("Photo upload failed")
                                        }
                                    }}
                                    className={styles.fileInput}
                                />
                                <p className={styles.hint}>Upload a professional headshot.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                    src={formData.profileImage}
                                    alt="Profile"
                                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, profileImage: '' }))}
                                    style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Investment Stage Preference</label>
                        <select
                            name="investmentStagePreference"
                            value={formData.investmentStagePreference}
                            onChange={handleInputChange}
                            className={styles.select}
                        >
                            <option value="SEED">Seed</option>
                            <option value="SERIES_A">Series A</option>
                            <option value="SERIES_B">Series B</option>
                            <option value="GROWTH">Growth</option>
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Industry Interests</label>
                        <IndustryTagInput
                            selectedTags={formData.interestTags}
                            onChange={(tags) => setFormData(prev => ({ ...prev, interestTags: tags }))}
                        />
                    </div>
                </div>
            )}

            {/* Step 3: Track Record */}
            {step === 3 && (
                <div className={styles.step}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Portfolio Companies (Optional)</label>
                        <PortfolioInput
                            companies={formData.portfolio}
                            onChange={(portfolio) => setFormData(prev => ({ ...prev, portfolio }))}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>LinkedIn URL (Optional)</label>
                        <input
                            name="linkedinUrl"
                            value={formData.linkedinUrl}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="https://linkedin.com/in/..."
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Twitter URL (Optional)</label>
                        <input
                            name="twitterUrl"
                            value={formData.twitterUrl}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="https://twitter.com/..."
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Website URL (Optional)</label>
                        <input
                            name="websiteUrl"
                            value={formData.websiteUrl}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="https://..."
                        />
                    </div>
                </div>
            )}

            {/* Footer / Navigation */}
            <div className={styles.buttonGroup}>
                {step > 1 ? (
                    <button onClick={prevStep} className={`${styles.button} ${styles.backButton}`}>
                        Back
                    </button>
                ) : (
                    <div></div>
                )}

                {step < 3 ? (
                    <button onClick={nextStep} className={`${styles.button} ${styles.nextButton}`}>
                        Next
                    </button>
                ) : (
                    <button onClick={handleSubmit} disabled={loading} className={`${styles.button} ${styles.nextButton}`}>
                        {loading ? 'Creating Profile...' : 'Complete Profile'}
                    </button>
                )}
            </div>
        </div>
    )
}
