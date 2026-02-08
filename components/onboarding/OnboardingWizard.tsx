'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Onboarding.module.css'

export default function OnboardingWizard() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        headline: '',
        location: '',
        bio: '',
        yearsExperience: 0,
        skills: [] as string[],
        founderType: 'TECHNICAL', // Default
        linkedinUrl: '',
        twitterUrl: '',
        websiteUrl: '',
    })

    const [currentSkill, setCurrentSkill] = useState('')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSkillKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && currentSkill.trim()) {
            e.preventDefault()
            if (!formData.skills.includes(currentSkill.trim())) {
                setFormData(prev => ({ ...prev, skills: [...prev.skills, currentSkill.trim()] }))
            }
            setCurrentSkill('')
        }
    }

    const removeSkill = (skill: string) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/onboarding/founder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                // Find out the founder ID or redirect to profile
                const data = await res.json()
                router.push(`/founder/${data.id}`)
            } else {
                alert('Failed to create profile. Please try again.') // Simple error handling for now
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
            <div className={styles.header}>
                <h1 className={styles.title}>
                    {step === 1 ? 'Build your Profile' : 'Experience & Skills'}
                </h1>
                <p className={styles.subtitle}>
                    {step === 1 ? 'Tell investors who you are.' : 'Showcase your expertise.'}
                </p>
            </div>

            <div className={styles.progress}>
                <div className={`${styles.stepIndicator} ${step >= 1 ? styles.active : ''}`} />
                <div className={`${styles.stepIndicator} ${step >= 2 ? styles.active : ''}`} />
            </div>

            {step === 1 && (
                <div className={styles.step}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Full Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. Jane Doe"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Headline</label>
                        <input
                            name="headline"
                            value={formData.headline}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. AI Engineer turning Founder"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Location</label>
                        <input
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="e.g. San Francisco, CA"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Bio</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleInputChange}
                            className={styles.textarea}
                            placeholder="Tell your story..."
                        />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className={styles.step}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Founder Type</label>
                        <select
                            name="founderType"
                            value={formData.founderType}
                            onChange={handleInputChange}
                            className={styles.select}
                        >
                            <option value="TECHNICAL">Technical Founder</option>
                            <option value="BUSINESS">Business Founder</option>
                            <option value="PRODUCT">Product Founder</option>
                            <option value="DESIGN">Design Founder</option>
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Years of Experience</label>
                        <input
                            type="number"
                            name="yearsExperience"
                            value={formData.yearsExperience}
                            onChange={handleInputChange}
                            className={styles.input}
                            min="0"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Skills (Press Enter to add)</label>
                        <div className={styles.tagsInput}>
                            {formData.skills.map(skill => (
                                <span key={skill} className={styles.tag}>
                                    {skill}
                                    <span className={styles.removeTag} onClick={() => removeSkill(skill)}>×</span>
                                </span>
                            ))}
                            <input
                                value={currentSkill}
                                onChange={(e) => setCurrentSkill(e.target.value)}
                                onKeyDown={handleSkillKeyDown}
                                className={styles.tagInputRaw}
                                placeholder="Add a skill..."
                            />
                        </div>
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
                </div>
            )}

            <div className={styles.buttonGroup}>
                {step > 1 ? (
                    <button onClick={prevStep} className={`${styles.button} ${styles.backButton}`}>
                        Back
                    </button>
                ) : (
                    <div></div> // Spacer
                )}

                {step < 2 ? (
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
