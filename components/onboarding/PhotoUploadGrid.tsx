'use client'

import { useState } from 'react'
import styles from './Onboarding.module.css'

interface PhotoUploadGridProps {
    photos: string[]
    onChange: (photos: string[]) => void
}

export default function PhotoUploadGrid({ photos, onChange }: PhotoUploadGridProps) {
    // We'll manage 6 slots. 'photos' array contains URLs.
    // Empty slots are essentially implied, but we render 6 slots always.

    const handleAddPhoto = (index: number) => {
        // For now, simple window prompt. Ideally a modal or file picker.
        const url = window.prompt("Enter image URL (e.g. from Unsplash):")
        if (url) {
            const newPhotos = [...photos]
            newPhotos[index] = url
            // Filter out empty slots to keep array clean? 
            // Actually, Hinge keeps order. So we might need an array of 6 items with nulls.
            // But the parent might expect just a list of valid photos.
            // Let's assume the parent handles a compacted list, but here we want to fill specific slots?
            // Hinge slots are ordered. 1, 2, 3...
            // Let's just treat it as: if you click slot 3, you are adding the 3rd photo.
            // But if slot 1 is empty, does slot 3 become slot 1? usually no.
            // Let's use a fixed array of 6 items for the UI state.

            // But prop is `string[]`. Let's assume we just append if flexible, 
            // OR we change the prop to `(string | null)[]`.
            // Let's keep it simple: the grid visualizes the *count* of photos.
            // If I have 2 photos, they take slot 1 and 2.
            // To keep it simple for now, standard "add to end" behavior is easiest to implement quickly.

            onChange([...photos, url])
        }
    }

    const handleRemovePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index)
        onChange(newPhotos)
    }

    // Generate 6 slots
    const slots = Array.from({ length: 6 })

    return (
        <div>
            <div className={styles.photoGrid}>
                {slots.map((_, index) => {
                    const photoUrl = photos[index]
                    return (
                        <div
                            key={index}
                            className={`${styles.photoSlot} ${photoUrl ? styles.filled : ''}`}
                            onClick={() => !photoUrl && handleAddPhoto(index)}
                        >
                            {photoUrl ? (
                                <>
                                    <img src={photoUrl} alt={`Photo ${index + 1}`} className={styles.photoImage} />
                                    <button
                                        className={styles.removePhoto}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemovePhoto(index)
                                        }}
                                    >
                                        ×
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className={styles.addPhotoIcon}>+</div>
                                    <span className={styles.addPhotoText}>Add Photo</span>
                                </>
                            )}
                        </div>
                    )
                })}
            </div>
            <p className={styles.subtitle} style={{ fontSize: '14px', marginBottom: '20px' }}>
                Add at least 3 photos to show your personality.
            </p>
        </div>
    )
}
