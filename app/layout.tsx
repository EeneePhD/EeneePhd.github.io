import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/shared/Toaster'

export const metadata: Metadata = {
  title: 'CRM Pro',
  description: 'Modern CRM for growing sales teams',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
