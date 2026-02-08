'use client'

import { useRouter } from 'next/navigation'
import styles from './ConversationList.module.css'

export interface ConversationItem {
    id: string
    investorId: string
    founderId: string
    productId: string
    lastMessageAt: string
    createdAt: string
    // Enriched data (filled in by parent)
    otherPartyName?: string
    otherPartyAvatar?: string | null
    productName?: string
}

interface ConversationListProps {
    conversations: ConversationItem[]
    userType: 'INVESTOR' | 'FOUNDER'
    basePath: string
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export default function ConversationList({
    conversations,
    userType,
    basePath,
}: ConversationListProps) {
    const router = useRouter()

    if (conversations.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <h3>No conversations yet</h3>
                    <p>
                        {userType === 'INVESTOR'
                            ? 'Find a startup you like and start a conversation!'
                            : 'Investors who like your product can message you here.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.list}>
                {conversations.map((conversation) => (
                    <div
                        key={conversation.id}
                        className={styles.conversationItem}
                        onClick={() => router.push(`${basePath}/${conversation.id}`)}
                    >
                        <div className={styles.avatarShell}>
                            {conversation.otherPartyAvatar ? (
                                <img
                                    src={conversation.otherPartyAvatar}
                                    alt={conversation.otherPartyName || 'User'}
                                    className={styles.avatarImage}
                                />
                            ) : (
                                <span className={styles.avatarInitials}>
                                    {getInitials(conversation.otherPartyName || 'U')}
                                </span>
                            )}
                        </div>
                        <div className={styles.content}>
                            <div className={styles.header}>
                                <span className={styles.name}>
                                    {conversation.otherPartyName || 'Unknown'}
                                </span>
                                <span className={styles.time}>
                                    {formatRelativeTime(conversation.lastMessageAt)}
                                </span>
                            </div>
                            {conversation.productName && (
                                <div className={styles.productName}>
                                    Re: {conversation.productName}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
