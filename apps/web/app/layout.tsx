import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ThemeRegistry from './ThemeRegistry'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'OneShot — Flight Scheduler',
  description: 'Agentic scheduling assistant for Flight Schedule Pro',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  )
}
