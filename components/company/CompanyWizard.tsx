'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

type UploadType = 'logo' | 'video'

const INITIAL_FORM_DATA: CompanyData = {
    name: '',
    tagline: '',
    websiteUrl: '',
    stage: 'Seed',
    askAmount: '',
    problem: '',
    solution: '',
    description: '',
    logoUrl: '',
    videoUrl: '',
}

const getErrorMessage = async (res: Response): Promise<string> => {
    const contentType = res.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
        const payload = await res.json().catch(() => null) as { error?: string; message?: string } | null
        if (payload?.error) return payload.error
        if (payload?.message) return payload.message
    }

    const text = await res.text().catch(() => '')
    return text || 'Request failed'
}

export default function CompanyWizard() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState<Record<UploadType, boolean>>({
        logo: false,
        video: false,
    })
    const [errorMessage, setErrorMessage] = useState('')
    const [formData, setFormData] = useState<CompanyData>(INITIAL_FORM_DATA)

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
        type: UploadType
    ) => {
        if (!e.target.files?.[0]) return

        const file = e.target.files[0]
        const body = new FormData()
        body.append('file', file)
        setErrorMessage('')
        setUploading((prev) => ({ ...prev, [type]: true }))

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body,
            })

            if (!res.ok) {
                throw new Error(await getErrorMessage(res))
            }

            const payload = await res.json() as { url?: string }
            if (!payload.url) {
                throw new Error('Upload did not return a file URL')
            }

            const key = type === 'logo' ? 'logoUrl' : 'videoUrl'
            setFormData((prev) => ({ ...prev, [key]: payload.url || '' }))
        } catch (error) {
            console.error(error)
            const message = error instanceof Error ? error.message : 'Upload failed'
            setErrorMessage(message)
        } finally {
            setUploading((prev) => ({ ...prev, [type]: false }))
        }
    }

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setErrorMessage('Company name is required')
            return
        }

        setLoading(true)
        setErrorMessage('')

        try {
            const res = await fetch('/api/company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    name: formData.name.trim(),
                    tagline: formData.tagline.trim(),
                }),
            })

            if (!res.ok) {
                throw new Error(await getErrorMessage(res))
            }

            const payload = await res.json() as {
                founderProduct?: {
                    founderId?: string
                }
            }

            const founderId = payload.founderProduct?.founderId
            if (!founderId) {
                throw new Error('Company was created but redirect data is missing')
            }

            router.push(`/founder/${founderId}`)
            router.refresh()
        } catch (error) {
            console.error(error)
            const message = error instanceof Error ? error.message : 'Failed to create company'
            setErrorMessage(message)
        } finally {
            setLoading(false)
        }
    }

    const uploadingMedia = uploading.logo || uploading.video

    return (
        <div className={styles.profile}>
            <div className={styles.feed}>
                <section className={styles.introCard}>
                    <h1 className={styles.pageTitle}>Create Your Company Page</h1>
                    <p className={styles.pageSubtitle}>
                        This is a blank product-page template. Add your name, fields, images,
                        and pitch video before publishing.
                    </p>
                </section>

                <section className={styles.videoHero}>
                    <label className={styles.videoUploadArea}>
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => { void handleFileChange(e, 'video') }}
                            className={styles.hiddenInput}
                        />
                        {formData.videoUrl ? (
                            <div className={styles.videoPreviewWrapper}>
                                <video
                                    src={formData.videoUrl}
                                    className={styles.videoPreview}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                />
                                <div className={styles.uploadOverlay}>Click to replace video</div>
                            </div>
                        ) : (
                            <div className={styles.videoPlaceholder}>
                                <p className={styles.placeholderTitle}>Top Pitch Video</p>
                                <p className={styles.placeholderText}>
                                    Click here to upload a short demo or founder intro.
                                </p>
                            </div>
                        )}
                    </label>

                    <div className={styles.mediaActions}>
                        {uploading.video && (
                            <p className={styles.helperText}>Uploading video...</p>
                        )}
                        {!uploading.video && (
                            <p className={styles.helperText}>Click the video area above to upload.</p>
                        )}
                        {formData.videoUrl && (
                            <button
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, videoUrl: '' }))}
                                className={styles.removeMediaButton}
                            >
                                Remove video
                            </button>
                        )}
                    </div>
                </section>

                <section className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.logoPanel}>
                            <label className={styles.logoUploadArea}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => { void handleFileChange(e, 'logo') }}
                                    className={styles.hiddenInput}
                                />
                                {formData.logoUrl ? (
                                    <div className={styles.logoPreviewWrapper}>
                                        <Image
                                            src={formData.logoUrl}
                                            alt="Company logo preview"
                                            fill
                                            sizes="110px"
                                            className={styles.logoPreview}
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.logoPlaceholder}>Click to add image</div>
                                )}
                            </label>
                            {uploading.logo && (
                                <p className={styles.helperText}>Uploading image...</p>
                            )}
                            {!uploading.logo && (
                                <p className={styles.helperText}>Click the image area to upload.</p>
                            )}
                        </div>

                        <div className={styles.headerFields}>
                            <div className={styles.field}>
                                <label className={styles.label}>Company Name</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={styles.nameInput}
                                    placeholder="Acme Labs"
                                    maxLength={100}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>One-Line Tagline</label>
                                <input
                                    name="tagline"
                                    value={formData.tagline}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder="A faster way to do X"
                                    maxLength={200}
                                />
                            </div>

                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Stage</label>
                                    <select
                                        name="stage"
                                        value={formData.stage}
                                        onChange={handleInputChange}
                                        className={styles.select}
                                    >
                                        <option value="Pre-Seed">Pre-Seed</option>
                                        <option value="Seed">Seed</option>
                                        <option value="Series A">Series A</option>
                                        <option value="Series B">Series B</option>
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Ask Amount (USD)</label>
                                    <input
                                        name="askAmount"
                                        type="number"
                                        value={formData.askAmount}
                                        onChange={handleInputChange}
                                        className={styles.input}
                                        placeholder="1000000"
                                        min={0}
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Website</label>
                                <input
                                    name="websiteUrl"
                                    value={formData.websiteUrl}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>About</h2>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className={styles.textarea}
                        placeholder="What is your startup building, and why now?"
                        rows={5}
                        maxLength={1000}
                    />
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>The Problem</h2>
                    <textarea
                        name="problem"
                        value={formData.problem}
                        onChange={handleInputChange}
                        className={styles.textarea}
                        placeholder="What pain are you solving?"
                        rows={4}
                        maxLength={500}
                    />
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Our Solution</h2>
                    <textarea
                        name="solution"
                        value={formData.solution}
                        onChange={handleInputChange}
                        className={styles.textarea}
                        placeholder="How is your product solving it better?"
                        rows={4}
                        maxLength={500}
                    />
                </section>

                {errorMessage && (
                    <div className={styles.errorBanner}>{errorMessage}</div>
                )}

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={`${styles.actionButton} ${styles.secondaryButton}`}
                        onClick={() => router.back()}
                        disabled={loading}
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || uploadingMedia}
                        className={`${styles.actionButton} ${styles.primaryButton}`}
                    >
                        {loading ? 'Creating...' : 'Create Company'}
                    </button>
                </div>
            </div>
        </div>
    )
}
