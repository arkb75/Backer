import Link from "next/link"
import styles from "./FounderBottomNav.module.css"

type FounderNavTab = "profile" | "products" | "messages"

interface FounderBottomNavProps {
    activeTab?: FounderNavTab
    profileHref: string
    messageBadgeCount?: number
}

const tabs = (profileHref: string): Array<{ key: FounderNavTab; label: string; href: string }> => [
    { key: "profile", label: "Profile", href: profileHref },
    { key: "products", label: "Products", href: "/founder/products" },
    { key: "messages", label: "Messages", href: "/founder/messages" },
]

export default function FounderBottomNav({
    activeTab,
    profileHref,
    messageBadgeCount = 0,
}: FounderBottomNavProps) {
    return (
        <nav className={styles.nav} aria-label="Founder navigation">
            {tabs(profileHref).map((tab) => (
                <Link
                    key={tab.key}
                    href={tab.href}
                    className={`${styles.link} ${activeTab === tab.key ? styles.active : ""}`}
                >
                    <span>{tab.label}</span>
                    {tab.key === "messages" && messageBadgeCount > 0 && (
                        <span className={styles.badge}>
                            {messageBadgeCount > 99 ? "99+" : messageBadgeCount}
                        </span>
                    )}
                </Link>
            ))}
        </nav>
    )
}
