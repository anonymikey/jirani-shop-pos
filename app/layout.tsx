import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { PwaRegister } from '@/components/pwa-register'
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
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/favicon-32x32-u2LwRwy8ekrWP44N3hKG9o4KakLVV0.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/favicon-16x16-faK2msCUOLuhsg8LMSo0XfgnTFEno5.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/apple-icon-180x180-zQm6gbophjGA3PqI7UBZJ4VDofV9RR.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
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
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
