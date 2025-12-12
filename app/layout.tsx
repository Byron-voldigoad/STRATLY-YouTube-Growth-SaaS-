import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { AuthStateHandler } from '../components/auth/auth-state'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Stratly - Monthly YouTube Growth Plans',
  description: 'Get personalized monthly growth strategies for your YouTube channel',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AuthStateHandler />
          {children}
        </Providers>
      </body>
    </html>
  )
}

