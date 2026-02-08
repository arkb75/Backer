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

interface CustomSection {
    id: string
    title: string
    body: string
    imageUrl: string
    caption: string
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

const createCustomSectionId = (): string =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const sanitizeCustomSections = (sections: CustomSection[]) =>
    sections
        .map((section) => ({
            title: section.title.trim(),
            body: section.body.trim(),
            imageUrl: section.imageUrl,
            caption: section.caption.trim(),
        }))
        .filter((section) => (
            section.title ||
            section.body ||
            section.imageUrl ||
            section.caption
        ))

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
    const [customSections, setCustomSections] = useState<CustomSection[]>([])
    const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null)

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const uploadFile = async (file: File): Promise<string> => {
        const body = new FormData()
        body.append('file', file)

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

        return payload.url
    }

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
        type: UploadType
    ) => {
        if (!e.target.files?.[0]) return

        const input = e.target
        const file = input.files[0]
        setErrorMessage('')
        setUploading((prev) => ({ ...prev, [type]: true }))

        try {
            const url = await uploadFile(file)
            const key = type === 'logo' ? 'logoUrl' : 'videoUrl'
            setFormData((prev) => ({ ...prev, [key]: url }))
        } catch (error) {
            console.error(error)
            const message = error instanceof Error ? error.message : 'Upload failed'
            setErrorMessage(message)
        } finally {
            input.value = ''
            setUploading((prev) => ({ ...prev, [type]: false }))
        }
    }

    const addCustomSection = () => {
        setCustomSections((prev) => [
            ...prev,
            {
                id: createCustomSectionId(),
                title: '',
                body: '',
                imageUrl: '',
                caption: '',
            },
        ])
    }

    const updateCustomSection = (id: string, patch: Partial<CustomSection>) => {
        setCustomSections((prev) =>
            prev.map((section) => (section.id === id ? { ...section, ...patch } : section))
        )
    }

    const removeCustomSection = (id: string) => {
        setCustomSections((prev) => prev.filter((section) => section.id !== id))
    }

    const handleCustomSectionImageChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
        sectionId: string
    ) => {
        if (!e.target.files?.[0]) return

        const input = e.target
        const file = input.files[0]
        setErrorMessage('')
        setUploadingSectionId(sectionId)

        try {
            const url = await uploadFile(file)
            updateCustomSection(sectionId, { imageUrl: url })
        } catch (error) {
            console.error(error)
            const message = error instanceof Error ? error.message : 'Upload failed'
            setErrorMessage(message)
        } finally {
            input.value = ''
            setUploadingSectionId((current) => (current === sectionId ? null : current))
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
                    customSections: sanitizeCustomSections(customSections),
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

    const uploadingMedia = uploading.logo || uploading.video || Boolean(uploadingSectionId)

    return (
        <div className={styles.profile}>
            <div className={styles.feed}>
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
                                        sizes="(max-width: 720px) 160px, 200px"
                                        className={styles.logoPreview}
                                    />
                                </div>
                            ) : (
                                <div className={styles.logoPlaceholder}>Click to add icon</div>
                            )}
                        </label>
                        {uploading.logo && (
                            <p className={styles.helperText}>Uploading icon...</p>
                        )}
                        {!uploading.logo && (
                            <p className={styles.helperText}>Click the icon area to upload.</p>
                        )}
                    </div>

                    <div className={styles.headerFields}>
                        <div className={`${styles.field} ${styles.fieldFull}`}>
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

                        <div className={`${styles.field} ${styles.fieldFull}`}>
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

                        <div className={`${styles.field} ${styles.fieldFull}`}>
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

                <section className={styles.section}>
                    <div className={styles.customSectionHeader}>
                        <h2 className={styles.sectionTitle}>Additional Sections</h2>
                        <button
                            type="button"
                            className={styles.addSectionButton}
                            onClick={addCustomSection}
                            disabled={loading}
                        >
                            <span className={styles.plusIcon}>+</span>
                            <span>Add Section</span>
                        </button>
                    </div>
                    <p className={styles.sectionHint}>
                        Add optional text blocks or image + caption blocks to expand your page.
                    </p>

                    {customSections.length === 0 && (
                        <div className={styles.emptyCustomState}>
                            No additional sections yet. Click + Add Section to create one.
                        </div>
                    )}

                    {customSections.length > 0 && (
                        <div className={styles.customSectionList}>
                            {customSections.map((section, index) => (
                                <article key={section.id} className={styles.customSectionCard}>
                                    <div className={styles.customSectionToolbar}>
                                        <p className={styles.customSectionLabel}>Section {index + 1}</p>
                                        <button
                                            type="button"
                                            onClick={() => removeCustomSection(section.id)}
                                            className={styles.removeSectionButton}
                                        >
                                            Remove section
                                        </button>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Section Title</label>
                                        <input
                                            value={section.title}
                                            onChange={(e) =>
                                                updateCustomSection(section.id, { title: e.target.value })
                                            }
                                            className={styles.input}
                                            placeholder="Milestones, Traction, Roadmap..."
                                            maxLength={120}
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Section Content</label>
                                        <textarea
                                            value={section.body}
                                            onChange={(e) =>
                                                updateCustomSection(section.id, { body: e.target.value })
                                            }
                                            className={`${styles.textarea} ${styles.customTextarea}`}
                                            placeholder="Write any additional detail you want investors to see."
                                            maxLength={600}
                                            rows={4}
                                        />
                                    </div>

                                    <div className={styles.customMediaRow}>
                                        <label className={styles.customImageUploadArea}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => { void handleCustomSectionImageChange(e, section.id) }}
                                                className={styles.hiddenInput}
                                            />
                                            {section.imageUrl ? (
                                                <div className={styles.customImageWrapper}>
                                                    <Image
                                                        src={section.imageUrl}
                                                        alt="Section image preview"
                                                        fill
                                                        sizes="(max-width: 720px) 100vw, 260px"
                                                        className={styles.customImage}
                                                    />
                                                </div>
                                            ) : (
                                                <div className={styles.customImagePlaceholder}>
                                                    Click to add image
                                                </div>
                                            )}
                                        </label>

                                        <div className={styles.field}>
                                            <label className={styles.label}>Image Caption</label>
                                            <input
                                                value={section.caption}
                                                onChange={(e) =>
                                                    updateCustomSection(section.id, { caption: e.target.value })
                                                }
                                                className={styles.input}
                                                placeholder="What does this image show?"
                                                maxLength={150}
                                            />
                                            {uploadingSectionId === section.id && (
                                                <p className={styles.helperText}>Uploading section image...</p>
                                            )}
                                            {section.imageUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => updateCustomSection(section.id, { imageUrl: '' })}
                                                    className={styles.removeMediaButton}
                                                >
                                                    Remove image
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
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
