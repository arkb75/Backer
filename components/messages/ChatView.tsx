'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './ChatView.module.css'

export interface Message {
    id: string
    conversationId: string
    senderId: string
    senderType: 'INVESTOR' | 'FOUNDER'
    content: string
    createdAt: string
}

interface ChatViewProps {
    conversationId: string
    messages: Message[]
    currentUserType: 'INVESTOR' | 'FOUNDER'
    currentUserId: string // investorId or founderId depending on userType
    otherPartyName: string
    productName?: string
    backPath: string
    canSend?: boolean
    cannotSendReason?: string
}

function formatTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatView({
    conversationId,
    messages: initialMessages,
    currentUserType,
    currentUserId,
    otherPartyName,
    productName,
    backPath,
    canSend = true,
    cannotSendReason,
}: ChatViewProps) {
    const router = useRouter()
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!newMessage.trim() || sending || !canSend) return

        setSending(true)
        setError(null)

        try {
            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    content: newMessage.trim(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message')
            }

            // Add message to list
            setMessages((prev) => [...prev, data.message])
            setNewMessage('')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSending(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={() => router.push(backPath)}
                    aria-label="Back"
                >
                    ←
                </button>
                <div className={styles.headerInfo}>
                    <div className={styles.headerName}>{otherPartyName}</div>
                    {productName && (
                        <div className={styles.headerProduct}>Re: {productName}</div>
                    )}
                </div>
            </div>

            <div className={styles.messagesContainer}>
                {messages.length === 0 ? (
                    <div className={styles.emptyChat}>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isOwn =
                            (currentUserType === 'INVESTOR' && message.senderType === 'INVESTOR') ||
                            (currentUserType === 'FOUNDER' && message.senderType === 'FOUNDER')

                        return (
                            <div
                                key={message.id}
                                className={`${styles.messageBubble} ${isOwn ? styles.messageOwn : styles.messageOther
                                    }`}
                            >
                                <div className={styles.messageContent}>{message.content}</div>
                                <div className={styles.messageTime}>
                                    {formatTime(message.createdAt)}
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            {!canSend && cannotSendReason && (
                <div className={styles.errorMessage}>{cannotSendReason}</div>
            )}

            <div className={styles.inputContainer}>
                <input
                    type="text"
                    className={styles.input}
                    placeholder={canSend ? "Type a message..." : "Cannot send messages"}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={!canSend || sending}
                />
                <button
                    className={styles.sendButton}
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending || !canSend}
                    aria-label="Send message"
                >
                    <span className={styles.sendIcon}>➤</span>
                </button>
            </div>
        </div>
    )
}
