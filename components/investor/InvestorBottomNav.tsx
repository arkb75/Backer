"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent,
} from "react"
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

const TAB_SWITCH_DELAY_MS = 120

export default function InvestorBottomNav({ activeTab, profileHref }: InvestorBottomNavProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [optimisticTab, setOptimisticTab] = useState<InvestorNavTab>(activeTab)
    const timeoutRef = useRef<number | null>(null)
    const navTabs = tabs(profileHref)

    useEffect(() => {
        setOptimisticTab(activeTab)
    }, [activeTab])

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    const handleTabClick = useCallback(
        (
            event: MouseEvent<HTMLAnchorElement>,
            tab: { key: InvestorNavTab; href: string }
        ) => {
            if (event.defaultPrevented) return
            if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
            if (pathname === tab.href) return

            event.preventDefault()
            setOptimisticTab(tab.key)

            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current)
            }

            timeoutRef.current = window.setTimeout(() => {
                const viewTransitionDoc = document as Document & {
                    startViewTransition?: (update: () => void) => void
                }
                const navigate = () => router.push(tab.href)

                if (viewTransitionDoc.startViewTransition) {
                    viewTransitionDoc.startViewTransition(navigate)
                    return
                }
                navigate()
            }, TAB_SWITCH_DELAY_MS)
        },
        [pathname, router]
    )

    const activeIndex = navTabs.findIndex((tab) => tab.key === optimisticTab)
    const activeIndexVar = String(activeIndex < 0 ? 0 : activeIndex)

    return (
        <nav className={styles.nav} aria-label="Investor navigation">
            <span
                aria-hidden
                className={styles.activePill}
                style={{ "--tab-index": activeIndexVar } as CSSProperties}
            />
            {navTabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={tab.href}
                    className={`${styles.link} ${optimisticTab === tab.key ? styles.active : ""}`}
                    onClick={(event) => handleTabClick(event, tab)}
                    aria-current={optimisticTab === tab.key ? "page" : undefined}
                >
                    {tab.label}
                </Link>
            ))}
        </nav>
    )
}
