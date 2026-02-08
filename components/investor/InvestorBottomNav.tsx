"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    useCallback,
    useEffect,
    useLayoutEffect,
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
    const tabRefs = useRef<Partial<Record<InvestorNavTab, HTMLAnchorElement | null>>>({})
    const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties | undefined>(undefined)
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

    const updateIndicator = useCallback((tabKey: InvestorNavTab) => {
        const activeLink = tabRefs.current[tabKey]
        if (!activeLink) return

        setIndicatorStyle({
            left: activeLink.offsetLeft,
            width: activeLink.offsetWidth,
        })
    }, [])

    useLayoutEffect(() => {
        updateIndicator(optimisticTab)
    }, [optimisticTab, updateIndicator])

    useEffect(() => {
        const handleResize = () => updateIndicator(optimisticTab)
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [optimisticTab, updateIndicator])

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

    return (
        <nav className={styles.nav} aria-label="Investor navigation">
            <span
                aria-hidden
                className={styles.activePill}
                style={indicatorStyle}
            />
            {navTabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={tab.href}
                    ref={(element) => {
                        tabRefs.current[tab.key] = element
                    }}
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
