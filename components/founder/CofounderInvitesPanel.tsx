'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./CofounderInvitesPanel.module.css"

interface ProductOption {
    id: string
    name: string
}

interface InviteRecord {
    id: string
    productName: string
    inviterFounderName: string
    role: string
    message?: string | null
    createdAt: string
}

interface InvitesResponse {
    invites: InviteRecord[]
    canRespond: boolean
}

interface CofounderInvitesPanelProps {
    products: ProductOption[]
}

export default function CofounderInvitesPanel({ products }: CofounderInvitesPanelProps) {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [role, setRole] = useState("Co-Founder")
    const [message, setMessage] = useState("")
    const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "")
    const [sending, setSending] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [loadingInvites, setLoadingInvites] = useState(true)
    const [canRespond, setCanRespond] = useState(false)
    const [pendingInvites, setPendingInvites] = useState<InviteRecord[]>([])
    const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null)

    const hasProducts = products.length > 0

    useEffect(() => {
        if (!selectedProductId && products[0]?.id) {
            setSelectedProductId(products[0].id)
        }
    }, [products, selectedProductId])

    const loadInvites = async () => {
        setLoadingInvites(true)
        try {
            const res = await fetch("/api/invitations", { cache: "no-store" })
            if (!res.ok) {
                setPendingInvites([])
                setCanRespond(false)
                return
            }
            const payload = await res.json() as InvitesResponse
            setPendingInvites(Array.isArray(payload.invites) ? payload.invites : [])
            setCanRespond(Boolean(payload.canRespond))
        } catch {
            setPendingInvites([])
            setCanRespond(false)
        } finally {
            setLoadingInvites(false)
        }
    }

    useEffect(() => {
        void loadInvites()
    }, [])

    const submitInvite = async () => {
        if (!hasProducts) {
            setError("Create a company first before inviting co-founders.")
            return
        }
        if (!selectedProductId || !email.trim()) {
            setError("Select a company and enter an email.")
            return
        }

        setSending(true)
        setError("")
        setSuccess("")
        try {
            const res = await fetch("/api/company/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProductId,
                    email: email.trim(),
                    role: role.trim() || "Co-Founder",
                    message: message.trim(),
                }),
            })

            const payload = await res.json().catch(() => null) as {
                error?: string
                emailSent?: boolean
            } | null

            if (!res.ok) {
                setError(payload?.error || "Failed to send invite")
                return
            }

            setSuccess(payload?.emailSent
                ? "Invite sent. Email delivered and in-app notification created."
                : "Invite saved. In-app notification created, but email could not be delivered.")
            setEmail("")
            setMessage("")
            await loadInvites()
        } catch {
            setError("Failed to send invite")
        } finally {
            setSending(false)
        }
    }

    const respondToInvite = async (inviteId: string, action: "accept" | "decline") => {
        setRespondingInviteId(inviteId)
        setError("")
        setSuccess("")
        try {
            const res = await fetch(`/api/invitations/${inviteId}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            })

            const payload = await res.json().catch(() => null) as {
                error?: string
                code?: string
            } | null

            if (!res.ok) {
                if (payload?.code === "FOUNDER_ONBOARDING_REQUIRED") {
                    setError("Complete founder onboarding first, then accept the invite.")
                } else {
                    setError(payload?.error || "Failed to respond to invite")
                }
                return
            }

            setPendingInvites((current) => current.filter((invite) => invite.id !== inviteId))
            if (action === "accept") {
                setSuccess("Invite accepted. Company has been added to your profile.")
                router.refresh()
            } else {
                setSuccess("Invite declined.")
            }
        } catch {
            setError("Failed to respond to invite")
        } finally {
            setRespondingInviteId(null)
        }
    }

    const pendingCountLabel = useMemo(() => {
        if (loadingInvites) return "Checking invitations..."
        if (pendingInvites.length === 0) return "No pending invitations right now."
        return `You have ${pendingInvites.length} pending co-founder invitation${pendingInvites.length > 1 ? "s" : ""}.`
    }, [loadingInvites, pendingInvites.length])

    return (
        <section className={styles.panel}>
            <h3 className={styles.title}>Co-Founder Invitations</h3>
            <p className={styles.hint}>{pendingCountLabel}</p>

            {pendingInvites.length > 0 && (
                <div className={styles.inviteList}>
                    {pendingInvites.map((invite) => (
                        <article key={invite.id} className={styles.inviteCard}>
                            <p className={styles.inviteMeta}>
                                <strong>{invite.inviterFounderName}</strong> invited you to join <strong>{invite.productName}</strong> as {invite.role}.
                            </p>
                            {invite.message && (
                                <p className={styles.inviteMeta}>
                                    Message: {invite.message}
                                </p>
                            )}
                            {canRespond && (
                                <div className={styles.inviteActions}>
                                    <button
                                        type="button"
                                        className={styles.primaryButton}
                                        onClick={() => { void respondToInvite(invite.id, "accept") }}
                                        disabled={respondingInviteId === invite.id}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.secondaryButton}
                                        onClick={() => { void respondToInvite(invite.id, "decline") }}
                                        disabled={respondingInviteId === invite.id}
                                    >
                                        Decline
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            <div className={styles.form}>
                <div className={styles.row}>
                    <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className={styles.select}
                        disabled={!hasProducts || sending}
                    >
                        {hasProducts
                            ? products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))
                            : <option value="">No companies yet</option>}
                    </select>

                    <input
                        type="email"
                        className={styles.input}
                        placeholder="cofounder@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={sending}
                    />
                </div>

                <div className={styles.row}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Role (e.g. CTO, Co-Founder)"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={sending}
                    />
                    <button
                        type="button"
                        className={styles.button}
                        onClick={() => { void submitInvite() }}
                        disabled={sending}
                    >
                        {sending ? "Sending..." : "Send Invite"}
                    </button>
                </div>

                <textarea
                    className={styles.textarea}
                    placeholder="Optional message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sending}
                />
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.success}>{success}</p>}
        </section>
    )
}
