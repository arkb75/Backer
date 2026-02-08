'use client'

import { useRef, useState } from 'react'
import styles from './Onboarding.module.css'

interface PhotoUploadGridProps {
    photos: string[]
    onChange: (photos: string[]) => void
}

export default function PhotoUploadGrid({ photos, onChange }: PhotoUploadGridProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    const handleAddPhoto = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            if (!res.ok) throw new Error("Upload failed")

            const data = await res.json()
            if (data.url) {
                onChange([...photos, data.url])
            }
        } catch (err) {
            console.error(err)
            alert("Failed to upload image. Please try again.")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleRemovePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index)
        onChange(newPhotos)
    }

    // Create 6 slots
    const slots = Array.from({ length: 6 })

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className={styles.hiddenInput}
            />

            <div className={styles.photoGrid}>
                {slots.map((_, index) => {
                    const photoUrl = photos[index]

                    return (
                        <div
                            key={index}
                            className={styles.photoSlot}
                            onClick={() => !photoUrl && handleAddPhoto()}
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
                                <div className={styles.addPhotoPlaceholder}>
                                    {isUploading && index === photos.length ? (
                                        <span className={styles.spinner}>...</span>
                                    ) : (
                                        <span className={styles.addPhotoPlus}>+</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <p className={`${styles.subtitle} ${styles.photoHint}`}>
                Add at least 3 photos to show your personality.
            </p>
        </>
    )
}
