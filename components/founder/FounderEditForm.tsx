'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FounderRecord, FounderType } from '@/lib/db/types'
import PhotoUploadGrid from '@/components/onboarding/PhotoUploadGrid'
import PromptSelector, { PromptItem } from '@/components/onboarding/PromptSelector'
import styles from '@/components/profile/ProfileEditForm.module.css'

interface FounderEditFormProps {
    founder: FounderRecord
}

export default function FounderEditForm({ founder }: FounderEditFormProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [uploadingVideo, setUploadingVideo] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const initialPhotos = useMemo(
        () => [...founder.photos].sort((a, b) => a.order - b.order).map((photo) => photo.url),
        [founder.photos]
    )
    const initialPrompts = useMemo<PromptItem[]>(
        () => [...founder.prompts]
            .sort((a, b) => a.order - b.order)
            .map((prompt) => ({ prompt: prompt.prompt, answer: prompt.answer })),
        [founder.prompts]
    )

    const [formData, setFormData] = useState({
        name: founder.name,
        headline: founder.headline,
        location: founder.location,
        bio: founder.bio,
        founderType: founder.founderType,
        yearsExperience: founder.yearsExperience ? String(founder.yearsExperience) : '',
        linkedinUrl: founder.linkedinUrl || '',
        twitterUrl: founder.twitterUrl || '',
        websiteUrl: founder.websiteUrl || '',
        videoUrl: founder.videoUrl || '',
        photos: initialPhotos,
        prompts: initialPrompts,
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

    const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget
        const file = input.files?.[0]
        if (!file) return

        setUploadingVideo(true)
        setError('')
        setSuccess('')
        try {
            const url = await uploadFile(file)
            setFormData((prev) => ({ ...prev, videoUrl: url }))
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'Video upload failed')
        } finally {
            input.value = ''
            setUploadingVideo(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (saving) return

        setError('')
        setSuccess('')

        if (!formData.name.trim() || !formData.headline.trim() || !formData.location.trim() || !formData.bio.trim()) {
            setError('Name, headline, location, and bio are required.')
            return
        }
        if (formData.photos.length === 0) {
            setError('Add at least one photo.')
            return
        }

        const yearsExperienceValue =
            formData.yearsExperience.trim().length > 0
                ? Math.max(0, Math.floor(Number(formData.yearsExperience)))
                : null

        setSaving(true)
        try {
            const res = await fetch('/api/profile/founder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    headline: formData.headline,
                    location: formData.location,
                    bio: formData.bio,
                    founderType: formData.founderType,
                    yearsExperience: Number.isFinite(yearsExperienceValue as number) ? yearsExperienceValue : null,
                    linkedinUrl: formData.linkedinUrl,
                    twitterUrl: formData.twitterUrl,
                    websiteUrl: formData.websiteUrl,
                    videoUrl: formData.videoUrl,
                    photos: formData.photos,
                    prompts: formData.prompts,
                }),
            })

            const payload = await res.json().catch(() => null) as { error?: string } | null
            if (!res.ok) {
                throw new Error(payload?.error || 'Failed to update founder profile')
            }

            setSuccess('Profile updated.')
            router.push(`/founder/${founder.id}`)
            router.refresh()
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Failed to update founder profile')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <h1 className={styles.title}>Edit Founder Profile</h1>
                <p className={styles.subtitle}>Update your public founder profile details.</p>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Name</label>
                            <input
                                className={styles.input}
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                maxLength={120}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Founder Type</label>
                            <select
                                className={styles.select}
                                value={formData.founderType}
                                onChange={(e) => setFormData((prev) => ({
                                    ...prev,
                                    founderType: e.target.value as FounderType,
                                }))}
                            >
                                <option value="FIRST_TIME">First-time Founder</option>
                                <option value="SERIAL">Serial Founder</option>
                                <option value="EXITED">Exited Founder</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Headline</label>
                            <input
                                className={styles.input}
                                value={formData.headline}
                                onChange={(e) => setFormData((prev) => ({ ...prev, headline: e.target.value }))}
                                maxLength={240}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Location</label>
                            <input
                                className={styles.input}
                                value={formData.location}
                                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                                maxLength={180}
                            />
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Years Experience</label>
                            <input
                                className={styles.input}
                                type="number"
                                min={0}
                                max={80}
                                value={formData.yearsExperience}
                                onChange={(e) => setFormData((prev) => ({ ...prev, yearsExperience: e.target.value }))}
                            />
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
                    </div>

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
                        <label className={styles.label}>Bio</label>
                        <textarea
                            className={styles.textarea}
                            value={formData.bio}
                            onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                            maxLength={2400}
                        />
                    </div>

                    <div className={styles.section}>
                        <div className={styles.field}>
                            <label className={styles.label}>Intro Video</label>
                            <div className={styles.mediaRow}>
                                <label className={styles.uploadButton}>
                                    Upload video
                                    <input
                                        type="file"
                                        accept="video/*"
                                        className={styles.hiddenInput}
                                        onChange={(e) => { void handleVideoFileChange(e) }}
                                    />
                                </label>
                                {uploadingVideo && <span className={styles.helper}>Uploading...</span>}
                                {!uploadingVideo && formData.videoUrl && <span className={styles.helper}>Video uploaded</span>}
                            </div>
                            {formData.videoUrl && (
                                <video
                                    src={formData.videoUrl}
                                    controls
                                    style={{ width: '100%', borderRadius: '10px', background: '#000' }}
                                />
                            )}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.field}>
                            <label className={styles.label}>Photos</label>
                            <PhotoUploadGrid
                                photos={formData.photos}
                                onChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
                            />
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.field}>
                            <label className={styles.label}>Prompts</label>
                            <PromptSelector
                                prompts={formData.prompts}
                                onChange={(prompts) => setFormData((prev) => ({ ...prev, prompts }))}
                            />
                        </div>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                    {success && <p className={styles.success}>{success}</p>}

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={`${styles.button} ${styles.secondary}`}
                            onClick={() => router.push(`/founder/${founder.id}`)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`${styles.button} ${styles.primary}`}
                            disabled={saving || uploadingVideo}
                        >
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
