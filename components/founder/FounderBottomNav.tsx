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

const TAB_SWITCH_DELAY_MS = 120

function getActiveTabFromPath(pathname: string): FounderNavTab {
    if (pathname.startsWith("/founder/messages")) return "messages"
    if (pathname.startsWith("/founder/products") || pathname.startsWith("/start-company")) return "products"
    return "profile"
}

export default function FounderBottomNav({
    activeTab,
    profileHref,
    messageBadgeCount = 0,
}: FounderBottomNavProps) {
    const router = useRouter()
    const pathname = usePathname()
    const resolvedActiveTab = activeTab ?? getActiveTabFromPath(pathname)
    const [optimisticTab, setOptimisticTab] = useState<FounderNavTab>(resolvedActiveTab)
    const timeoutRef = useRef<number | null>(null)
    const tabRefs = useRef<Partial<Record<FounderNavTab, HTMLAnchorElement | null>>>({})
    const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties | undefined>(undefined)
    const navTabs = tabs(profileHref)

    useEffect(() => {
        setOptimisticTab(resolvedActiveTab)
    }, [resolvedActiveTab])

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    const updateIndicator = useCallback((tabKey: FounderNavTab) => {
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
            tab: { key: FounderNavTab; href: string }
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
        <nav className={styles.nav} aria-label="Founder navigation">
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
