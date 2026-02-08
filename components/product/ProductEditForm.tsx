'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductRecord, ProductStatus } from '@/lib/db/types'
import styles from './ProductEditForm.module.css'

interface ProductEditFormProps {
    product: ProductRecord
}

type CustomSection = {
    title: string
    body: string
    imageUrl: string
    caption: string
}
const UPLOAD_TIMEOUT_MS = 45_000

const STATUS_OPTIONS: ProductStatus[] = ['IDEA', 'BUILDING', 'LAUNCHED', 'RAISING', 'FUNDED']

const STAGE_OPTIONS = [
    'Pre-Seed',
    'Seed',
    'Series A',
    'Series B',
    'Series C',
    'Growth',
]

const createSection = (): CustomSection => ({
    title: '',
    body: '',
    imageUrl: '',
    caption: '',
})

export default function ProductEditForm({ product }: ProductEditFormProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [uploading, setUploading] = useState<'logo' | 'video' | `section:${number}` | null>(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [formData, setFormData] = useState({
        name: product.name || '',
        tagline: product.tagline || '',
        websiteUrl: product.websiteUrl || '',
        stage: product.stage || 'Seed',
        status: product.status || 'BUILDING',
        askAmount: product.askAmount ? String(product.askAmount) : '',
        description: product.description || '',
        problem: product.problem || '',
        solution: product.solution || '',
        logoUrl: product.logoUrl || '',
        videoUrl: product.videoUrl || '',
        customSections: (product.customSections || []).map((section) => ({
            title: section.title || '',
            body: section.body || '',
            imageUrl: section.imageUrl || '',
            caption: section.caption || '',
        })) as CustomSection[],
    })

    const uploadFile = async (file: File): Promise<string> => {
        const body = new FormData()
        body.append('file', file)

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

        let res: Response
        try {
            res = await fetch('/api/upload', {
                method: 'POST',
                body,
                signal: controller.signal,
            })
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new Error('Upload timed out. Please try again.')
            }
            throw error
        } finally {
            clearTimeout(timeout)
        }

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

    const handleUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        target: 'logo' | 'video' | { sectionIndex: number }
    ) => {
        const input = e.currentTarget
        const file = input.files?.[0]
        if (!file) return

        const uploadTarget: 'logo' | 'video' | `section:${number}` =
            target === 'logo' || target === 'video' ? target : `section:${target.sectionIndex}`
        setUploading(uploadTarget)
        setError('')
        setSuccess('')
        try {
            const url = await uploadFile(file)
            if (target === 'logo') {
                setFormData((prev) => ({ ...prev, logoUrl: url }))
            } else if (target === 'video') {
                setFormData((prev) => ({ ...prev, videoUrl: url }))
            } else {
                setFormData((prev) => ({
                    ...prev,
                    customSections: prev.customSections.map((section, index) =>
                        index === target.sectionIndex ? { ...section, imageUrl: url } : section
                    ),
                }))
            }
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
        } finally {
            input.value = ''
            setUploading(null)
        }
    }

    const updateCustomSection = (index: number, patch: Partial<CustomSection>) => {
        setFormData((prev) => ({
            ...prev,
            customSections: prev.customSections.map((section, sectionIndex) =>
                sectionIndex === index ? { ...section, ...patch } : section
            ),
        }))
    }

    const addCustomSection = () => {
        setFormData((prev) => ({
            ...prev,
            customSections: [...prev.customSections, createSection()],
        }))
    }

    const removeCustomSection = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            customSections: prev.customSections.filter((_, sectionIndex) => sectionIndex !== index),
        }))
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (saving || deleting) return

        setError('')
        setSuccess('')

        if (uploading) {
            setError('Please wait for uploads to finish before saving.')
            return
        }

        if (!formData.name.trim() || !formData.tagline.trim()) {
            setError('Product name and tagline are required.')
            return
        }

        setSaving(true)
        try {
            const res = await fetch(`/api/product/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    tagline: formData.tagline,
                    websiteUrl: formData.websiteUrl,
                    stage: formData.stage,
                    status: formData.status,
                    askAmount: formData.askAmount,
                    description: formData.description,
                    problem: formData.problem,
                    solution: formData.solution,
                    logoUrl: formData.logoUrl,
                    videoUrl: formData.videoUrl,
                    customSections: formData.customSections,
                }),
            })

            const payload = await res.json().catch(() => null) as { error?: string } | null
            if (!res.ok) {
                throw new Error(payload?.error || 'Failed to save product')
            }

            setSuccess('Product updated.')
            router.push(`/product/${product.id}`)
            router.refresh()
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save product')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (saving || deleting) return

        const confirmed = window.confirm('Delete this product? This also removes invites, interests, and product conversations.')
        if (!confirmed) return

        setDeleting(true)
        setError('')
        setSuccess('')
        try {
            const res = await fetch(`/api/product/${product.id}`, { method: 'DELETE' })
            const payload = await res.json().catch(() => null) as { error?: string } | null
            if (!res.ok) {
                throw new Error(payload?.error || 'Failed to delete product')
            }

            router.push('/founder/products')
            router.refresh()
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete product')
            setDeleting(false)
        }
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <h1 className={styles.title}>Edit Product</h1>
                <p className={styles.subtitle}>Update startup details and content sections.</p>

                <form className={styles.form} onSubmit={handleSave}>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Company Name</label>
                            <input
                                className={styles.input}
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                maxLength={120}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Tagline</label>
                            <input
                                className={styles.input}
                                value={formData.tagline}
                                onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                                maxLength={240}
                            />
                        </div>
                    </div>

                    <div className={styles.rowTriple}>
                        <div className={styles.field}>
                            <label className={styles.label}>Stage</label>
                            <select
                                className={styles.select}
                                value={formData.stage}
                                onChange={(e) => setFormData((prev) => ({ ...prev, stage: e.target.value }))}
                            >
                                {STAGE_OPTIONS.map((stage) => (
                                    <option key={stage} value={stage}>
                                        {stage}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Status</label>
                            <select
                                className={styles.select}
                                value={formData.status}
                                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ProductStatus }))}
                            >
                                {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Ask Amount (USD)</label>
                            <input
                                className={styles.input}
                                value={formData.askAmount}
                                onChange={(e) => setFormData((prev) => ({ ...prev, askAmount: e.target.value }))}
                                placeholder="1000000"
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

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Logo</label>
                            <div className={styles.mediaRow}>
                                <label className={styles.uploadButton}>
                                    Upload logo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className={styles.hiddenInput}
                                        onChange={(e) => { void handleUpload(e, 'logo') }}
                                    />
                                </label>
                                {uploading === 'logo' && <span className={styles.helper}>Uploading...</span>}
                            </div>
                            {formData.logoUrl && (
                                <img src={formData.logoUrl} alt="Logo preview" className={styles.previewImage} />
                            )}
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Pitch Video</label>
                            <div className={styles.mediaRow}>
                                <label className={styles.uploadButton}>
                                    Upload video
                                    <input
                                        type="file"
                                        accept="video/*"
                                        className={styles.hiddenInput}
                                        onChange={(e) => { void handleUpload(e, 'video') }}
                                    />
                                </label>
                                {uploading === 'video' && <span className={styles.helper}>Uploading...</span>}
                            </div>
                            {formData.videoUrl && (
                                <video src={formData.videoUrl} className={styles.previewVideo} controls />
                            )}
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>About</label>
                        <textarea
                            className={styles.textarea}
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            maxLength={2400}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Problem</label>
                        <textarea
                            className={styles.textarea}
                            value={formData.problem}
                            onChange={(e) => setFormData((prev) => ({ ...prev, problem: e.target.value }))}
                            maxLength={1800}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Solution</label>
                        <textarea
                            className={styles.textarea}
                            value={formData.solution}
                            onChange={(e) => setFormData((prev) => ({ ...prev, solution: e.target.value }))}
                            maxLength={1800}
                        />
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Additional Sections</h2>
                            <button
                                type="button"
                                className={styles.addButton}
                                onClick={addCustomSection}
                            >
                                + Add Section
                            </button>
                        </div>
                        <p className={styles.sectionHint}>Add optional text or image blocks for this page.</p>

                        <div className={styles.sectionList}>
                            {formData.customSections.map((section, index) => (
                                <div className={styles.sectionCard} key={`${index}-${section.title}`}>
                                    <div className={styles.sectionTop}>
                                        <strong>Section {index + 1}</strong>
                                        <button
                                            type="button"
                                            className={styles.removeButton}
                                            onClick={() => removeCustomSection(index)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Title</label>
                                        <input
                                            className={styles.input}
                                            value={section.title}
                                            onChange={(e) => updateCustomSection(index, { title: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Body</label>
                                        <textarea
                                            className={styles.textarea}
                                            value={section.body}
                                            onChange={(e) => updateCustomSection(index, { body: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Caption</label>
                                            <input
                                                className={styles.input}
                                                value={section.caption}
                                                onChange={(e) => updateCustomSection(index, { caption: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Section Image</label>
                                            <div className={styles.mediaRow}>
                                                <label className={styles.uploadButton}>
                                                    Upload image
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className={styles.hiddenInput}
                                                        onChange={(e) => { void handleUpload(e, { sectionIndex: index }) }}
                                                    />
                                                </label>
                                                {uploading === `section:${index}` && <span className={styles.helper}>Uploading...</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {section.imageUrl && (
                                        <img src={section.imageUrl} alt={`Section ${index + 1}`} className={styles.previewImage} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                    {success && <p className={styles.success}>{success}</p>}

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={`${styles.button} ${styles.danger}`}
                            onClick={() => { void handleDelete() }}
                            disabled={deleting || saving}
                        >
                            {deleting ? 'Deleting...' : 'Delete Product'}
                        </button>
                        <div className={styles.rightActions}>
                            <button
                                type="button"
                                className={`${styles.button} ${styles.secondary}`}
                                onClick={() => router.push(`/product/${product.id}`)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`${styles.button} ${styles.primary}`}
                                disabled={saving || deleting}
                            >
                                {saving ? 'Saving...' : 'Save Product'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
