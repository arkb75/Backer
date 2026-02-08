'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Onboarding.module.css'
import PhotoUploadGrid from './PhotoUploadGrid'
import PromptSelector, { PromptItem } from './PromptSelector'

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
        founderType: 'FIRST_TIME',
        photos: [] as string[],
        prompts: [] as PromptItem[],
        videoUrl: '' // optional
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async () => {
        if (formData.photos.length === 0) {
            alert("Please add at least one photo.")
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/onboarding/founder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                const data = await res.json()
                // Success! Redirect.
                // TODO: In Phase 2, redirect to /start-company or similar.
                // For now, go to profile.
                router.push(`/founder/${data.id}`)
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
                    {step === 2 && 'Your Story'}
                    {step === 3 && 'Digging Deeper'}
                </h1>
                <p className={styles.subtitle}>
                    {step === 1 && 'Let\'s start with the essentials.'}
                    {step === 2 && 'Show investors who you are.'}
                    {step === 3 && 'Share what makes you tick.'}
                </p>
            </div>

            {/* Progress */}
            <div className={styles.progress}>
                <div className={`${styles.stepIndicator} ${step >= 1 ? styles.active : ''}`} />
                <div className={`${styles.stepIndicator} ${step >= 2 ? styles.active : ''}`} />
                <div className={`${styles.stepIndicator} ${step >= 3 ? styles.active : ''}`} />
            </div>

            {/* Step 1: Vitals */}
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
                            placeholder="e.g. Building the future of AI"
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
                        <label className={styles.label}>Founder Type</label>
                        <select
                            name="founderType"
                            value={formData.founderType}
                            onChange={handleInputChange}
                            className={styles.select}
                        >
                            <option value="FIRST_TIME">First-time Founder</option>
                            <option value="SERIAL">Serial Founder</option>
                            <option value="EXITED">Exited Founder</option>
                        </select>
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

            {/* Step 2: Photos */}
            {step === 2 && (
                <div className={styles.step}>
                    <PhotoUploadGrid
                        photos={formData.photos}
                        onChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
                    />

                    <div className={styles.inputGroup} style={{ marginTop: '32px' }}>
                        <label className={styles.label}>Video Intro (Optional)</label>

                        {!formData.videoUrl ? (
                            <div className={styles.fileUploadWrapper}>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return

                                        // Simple local state for video upload loading if needed, 
                                        // but we can reuse main loading or add a specific one.
                                        // For now, let's just use a local var or assumes fast enough/optimistic?
                                        // Better to show loading.
                                        const btn = e.target
                                        const prevText = btn.parentElement?.innerText

                                        try {
                                            const body = new FormData()
                                            body.append("file", file)
                                            const res = await fetch("/api/upload", { method: "POST", body })
                                            if (!res.ok) throw new Error("Upload failed")
                                            const data = await res.json()
                                            setFormData(prev => ({ ...prev, videoUrl: data.url }))
                                        } catch (err) {
                                            alert("Video upload failed")
                                        }
                                    }}
                                    className={styles.fileInput}
                                />
                                <p className={styles.hint}>Upload a short video introducing yourself.</p>
                            </div>
                        ) : (
                            <div className={styles.videoPreview}>
                                <video src={formData.videoUrl} controls className={styles.videoPlayer} />
                                <button
                                    className={styles.removeVideo}
                                    onClick={() => setFormData(prev => ({ ...prev, videoUrl: '' }))}
                                >
                                    Remove Video
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3: Prompts */}
            {step === 3 && (
                <div className={styles.step}>
                    <PromptSelector
                        prompts={formData.prompts}
                        onChange={(prompts) => setFormData(prev => ({ ...prev, prompts }))}
                    />
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
