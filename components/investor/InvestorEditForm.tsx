'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InvestorRecord, InvestmentStage } from '@/lib/db/types'
import IndustryTagInput from '@/components/onboarding/IndustryTagInput'
import PortfolioInput, { PortfolioCompanyInput } from '@/components/onboarding/PortfolioInput'
import styles from '@/components/profile/ProfileEditForm.module.css'

interface InvestorEditFormProps {
    investor: InvestorRecord
}

export default function InvestorEditForm({ investor }: InvestorEditFormProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [formData, setFormData] = useState({
        name: investor.name,
        firmName: investor.firmName || '',
        title: investor.title || '',
        location: investor.location || '',
        bio: investor.bio || '',
        profileImage: investor.profileImage || '',
        investmentStagePreference: (investor.investmentStagePreference || 'SEED') as InvestmentStage,
        linkedinUrl: investor.linkedinUrl || '',
        twitterUrl: investor.twitterUrl || '',
        websiteUrl: investor.websiteUrl || '',
        interestTags: investor.interestTags.map((tag) => tag.name),
        portfolio: investor.portfolio.map((company): PortfolioCompanyInput => ({
            name: company.name,
            stage: company.stage,
            logoUrl: company.logoUrl || '',
        })),
    })

    const uploadFile = async (file: File): Promise<string> => {
        const body = new FormData()
        body.append('file', file)

        const res = await fetch('/api/upload', {
            method: 'POST',
            body,
        })

        if (!res.ok) {
            const payload = await res.json().catch(() => null) as { error?: string } | null
            throw new Error(payload?.error || 'Upload failed')
        }

        const payload = await res.json() as { url?: string }
        if (!payload.url) {
            throw new Error('Upload did not return a URL')
        }

        return payload.url
    }

    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget
        const file = input.files?.[0]
        if (!file) return

        setUploadingImage(true)
        setError('')
        setSuccess('')
        try {
            const url = await uploadFile(file)
            setFormData((prev) => ({ ...prev, profileImage: url }))
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed')
        } finally {
            input.value = ''
            setUploadingImage(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (saving) return

        setError('')
        setSuccess('')

        if (!formData.name.trim()) {
            setError('Name is required.')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/profile/investor', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    firmName: formData.firmName,
                    title: formData.title,
                    location: formData.location,
                    bio: formData.bio,
                    profileImage: formData.profileImage,
                    investmentStagePreference: formData.investmentStagePreference,
                    linkedinUrl: formData.linkedinUrl,
                    twitterUrl: formData.twitterUrl,
                    websiteUrl: formData.websiteUrl,
                    interestTags: formData.interestTags,
                    portfolio: formData.portfolio,
                }),
            })

            const payload = await res.json().catch(() => null) as { error?: string } | null
            if (!res.ok) {
                throw new Error(payload?.error || 'Failed to update investor profile')
            }

            setSuccess('Profile updated.')
            router.push(`/investor/${investor.id}`)
            router.refresh()
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Failed to update investor profile')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <h1 className={styles.title}>Edit Investor Profile</h1>
                <p className={styles.subtitle}>Update your public investor profile details.</p>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Name</label>
                            <input
                                className={styles.input}
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Firm Name</label>
                            <input
                                className={styles.input}
                                value={formData.firmName}
                                onChange={(e) => setFormData((prev) => ({ ...prev, firmName: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Title</label>
                            <input
                                className={styles.input}
                                value={formData.title}
                                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Location</label>
                            <input
                                className={styles.input}
                                value={formData.location}
                                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Bio</label>
                        <textarea
                            className={styles.textarea}
                            value={formData.bio}
                            onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                            maxLength={2400}
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Investment Stage Preference</label>
                            <select
                                className={styles.select}
                                value={formData.investmentStagePreference}
                                onChange={(e) => setFormData((prev) => ({
                                    ...prev,
                                    investmentStagePreference: e.target.value as InvestmentStage,
                                }))}
                            >
                                <option value="SEED">Seed</option>
                                <option value="SERIES_A">Series A</option>
                                <option value="SERIES_B">Series B</option>
                                <option value="GROWTH">Growth</option>
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Profile Image</label>
                            <div className={styles.mediaRow}>
                                <label className={styles.uploadButton}>
                                    Upload image
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className={styles.hiddenInput}
                                        onChange={(e) => { void handleImageFileChange(e) }}
                                    />
                                </label>
                                {uploadingImage && <span className={styles.helper}>Uploading...</span>}
                                {!uploadingImage && formData.profileImage && <span className={styles.helper}>Image uploaded</span>}
                            </div>
                        </div>
                    </div>

                    {formData.profileImage && (
                        <img
                            src={formData.profileImage}
                            alt="Profile"
                            style={{ width: '120px', height: '120px', borderRadius: '14px', objectFit: 'cover' }}
                        />
                    )}

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>LinkedIn</label>
                            <input
                                className={styles.input}
                                value={formData.linkedinUrl}
                                onChange={(e) => setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                                placeholder="https://linkedin.com/in/..."
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Twitter/X</label>
                            <input
                                className={styles.input}
                                value={formData.twitterUrl}
                                onChange={(e) => setFormData((prev) => ({ ...prev, twitterUrl: e.target.value }))}
                                placeholder="https://x.com/..."
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Website</label>
                        <input
                            className={styles.input}
                            value={formData.websiteUrl}
                            onChange={(e) => setFormData((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                            placeholder="https://..."
                        />
                    </div>

                    <div className={styles.section}>
                        <div className={styles.field}>
                            <label className={styles.label}>Industry Focus</label>
                            <IndustryTagInput
                                selectedTags={formData.interestTags}
                                onChange={(interestTags) => setFormData((prev) => ({ ...prev, interestTags }))}
                            />
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.field}>
                            <label className={styles.label}>Portfolio</label>
                            <PortfolioInput
                                companies={formData.portfolio}
                                onChange={(portfolio) => setFormData((prev) => ({ ...prev, portfolio }))}
                            />
                        </div>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                    {success && <p className={styles.success}>{success}</p>}

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={`${styles.button} ${styles.secondary}`}
                            onClick={() => router.push(`/investor/${investor.id}`)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`${styles.button} ${styles.primary}`}
                            disabled={saving || uploadingImage}
                        >
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
