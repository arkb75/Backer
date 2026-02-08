import './globals.css'
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'

const manrope = Manrope({
    subsets: ['latin'],
    variable: '--font-body',
    display: 'swap',
})

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
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(() => {
  try {
    const stored = localStorage.getItem('theme');
    const theme = stored === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();`,
                    }}
                />
            </head>
            <body className={manrope.variable}>{children}</body>
        </html>
    )
}
