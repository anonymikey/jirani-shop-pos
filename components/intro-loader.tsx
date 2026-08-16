'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { logoUrl } from '@/components/brand-mark'

export function IntroLoader() {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsLeaving(true), 1500)
    const removeTimer = window.setTimeout(() => setIsVisible(false), 1950)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(removeTimer)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div
      aria-label="Loading JIRANI SHOP SYSTEM"
      aria-live="polite"
      role="status"
      className={`intro-loader fixed inset-0 z-50 flex items-center justify-center bg-background ${isLeaving ? 'intro-loader--leaving' : ''}`}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-8 px-8">
        <div className="intro-loader__logo relative flex items-center justify-center">
          <div className="intro-loader__halo absolute size-48 rounded-full bg-primary/10 blur-3xl" />
          <Image
            src={logoUrl}
            alt="JIRANI SHOP SYSTEM"
            width={520}
            height={260}
            priority
            className="intro-loader__mark relative h-auto w-full max-w-[300px] object-contain"
          />
        </div>
        <div className="flex w-full flex-col items-center gap-3">
          <div className="h-1 w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="intro-loader__progress h-full rounded-full bg-primary" />
          </div>
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            Preparing your shop
          </p>
        </div>
      </div>
    </div>
  )
}
