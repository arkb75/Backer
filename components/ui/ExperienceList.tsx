import styles from './ExperienceList.module.css'

export interface ExperienceItem {
    id: string
    role: string
    company: string
    years: string
}

interface ExperienceListProps {
    experiences: ExperienceItem[]
    maxDisplay?: number
}

export default function ExperienceList({ experiences, maxDisplay = 3 }: ExperienceListProps) {
    const displayExperiences = experiences.slice(0, maxDisplay)

    return (
        <ul className={styles.experienceList}>
            {displayExperiences.map((exp) => (
                <li key={exp.id} className={styles.experienceItem}>
                    <strong>{exp.role}</strong> @ {exp.company} ({exp.years})
                </li>
            ))}
        </ul>
    )
}
