import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { PwaRegister } from '@/components/pwa-register'
import { IntroLoader } from '@/components/intro-loader'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'JIRANI SYSTEM | Smart Retail & POS',
  description: 'Point of sale, inventory, and business management for modern retailers.',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      {
        url: '/icons/jirani-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icons/jirani-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: {
      url: '/icons/jirani-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <PwaRegister />
        <IntroLoader />
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
