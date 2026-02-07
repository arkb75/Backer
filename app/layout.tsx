import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Backer - Connect Founders with Investors',
    description: 'Discover promising startups and connect with exceptional founders',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
