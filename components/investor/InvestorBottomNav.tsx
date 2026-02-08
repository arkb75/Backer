import Link from "next/link"
import styles from "./InvestorBottomNav.module.css"

type InvestorNavTab = "profile" | "feed" | "messages"

interface InvestorBottomNavProps {
    activeTab: InvestorNavTab
    profileHref: string
}

const tabs = (profileHref: string): Array<{ key: InvestorNavTab; label: string; href: string }> => [
    { key: "profile", label: "Profile", href: profileHref },
    { key: "feed", label: "Feed", href: "/investor/feed" },
    { key: "messages", label: "Messages", href: "/investor/messages" },
]

export default function InvestorBottomNav({ activeTab, profileHref }: InvestorBottomNavProps) {
    return (
        <nav className={styles.nav} aria-label="Investor navigation">
            {tabs(profileHref).map((tab) => (
                <Link
                    key={tab.key}
                    href={tab.href}
                    className={`${styles.link} ${activeTab === tab.key ? styles.active : ""}`}
                >
                    {tab.label}
                </Link>
            ))}
        </nav>
    )
}
