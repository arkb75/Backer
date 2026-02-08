'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./CofounderInvitesPanel.module.css"

interface InviteRecord {
    id: string
    productId: string
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
    productId: string
    productName?: string
}

export default function CofounderInvitesPanel({
    productId,
    productName,
}: CofounderInvitesPanelProps) {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [role, setRole] = useState("Co-Founder")
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [loadingInvites, setLoadingInvites] = useState(true)
    const [canRespond, setCanRespond] = useState(false)
    const [pendingInvites, setPendingInvites] = useState<InviteRecord[]>([])
    const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null)

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

    const visibleInvites = useMemo(() => (
        pendingInvites.filter((invite) => invite.productId === productId)
    ), [pendingInvites, productId])

    const submitInvite = async () => {
        if (!productId) {
            setError("Missing company context.")
            return
        }
        if (!email.trim()) {
            setError("Enter an email.")
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
                    productId,
                    email: email.trim(),
                    role: role.trim() || "Co-Founder",
                    message: message.trim(),
                }),
            })

            const payload = await res.json().catch(() => null) as {
                error?: string
                code?: string
                emailSent?: boolean
                emailReason?: string | null
                alreadyPending?: boolean
            } | null

            if (!res.ok) {
                setError(payload?.error || "Failed to send invite")
                return
            }

            if (payload?.alreadyPending) {
                setSuccess(payload?.emailSent
                    ? "Invite already pending. Reminder email sent."
                    : `Invite already pending. Email was not delivered${payload?.emailReason ? `: ${payload.emailReason}` : "."}`)
            } else {
                setSuccess(payload?.emailSent
                    ? "Invite sent. Email delivered and in-app notification created."
                    : `Invite saved. In-app notification created, but email could not be delivered${payload?.emailReason ? `: ${payload.emailReason}` : "."}`)
            }
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
        if (visibleInvites.length === 0) return "No pending invitations for this startup right now."
        return `You have ${visibleInvites.length} pending co-founder invitation${visibleInvites.length > 1 ? "s" : ""} for this startup.`
    }, [loadingInvites, visibleInvites.length])

    return (
        <section className={styles.panel}>
            <h3 className={styles.title}>
                Co-Founder Invitations
                {productName ? ` - ${productName}` : ""}
            </h3>
            <p className={styles.hint}>{pendingCountLabel}</p>

            {visibleInvites.length > 0 && (
                <div className={styles.inviteList}>
                    {visibleInvites.map((invite) => (
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
                    <input
                        type="email"
                        className={styles.input}
                        placeholder="cofounder@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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

                <div className={styles.rowSingle}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Role (e.g. CTO, Co-Founder)"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={sending}
                    />
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
