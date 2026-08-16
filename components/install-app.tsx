"use client"

import { useEffect, useState } from "react"
import { Download, Monitor, Share, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type DeviceType = "ios" | "android" | "desktop" | "other"

function getDeviceType(): DeviceType {
  const userAgent = window.navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios"
  if (/android/.test(userAgent)) return "android"
  if (/windows|macintosh|linux|cros/.test(userAgent)) return "desktop"
  return "other"
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
}

export function InstallApp({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isStandalone())
  const [device] = useState<DeviceType>(() => typeof window !== "undefined" ? getDeviceType() : "other")

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    const displayMode = window.matchMedia("(display-mode: standalone)")
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setInstalled(true)
        setPromptEvent(null)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    window.addEventListener("appinstalled", handleInstalled)
    displayMode.addEventListener("change", handleDisplayModeChange)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleInstalled)
      displayMode.removeEventListener("change", handleDisplayModeChange)
    }
  }, [])

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }

  if (installed) return null

  if (compact) {
    if (!promptEvent) return null
    return (
      <Button type="button" variant="ghost" className="w-full justify-start" onClick={install}>
        <Download data-icon="inline-start" />
        Install JIRANI
      </Button>
    )
  }

  const isIosDevice = device === "ios"
  const Icon = device === "desktop" ? Monitor : Smartphone
  const description = isIosDevice
    ? "Add JIRANI to your iPhone or iPad home screen for one-tap access."
    : device === "android"
      ? "Install JIRANI on your Android device for faster sales and reliable shop access."
      : "Keep JIRANI one tap away for faster sales and reliable shop access."

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Icon className="size-5 text-primary" /> Install JIRANI</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {promptEvent ? (
          <Button type="button" onClick={install}><Download data-icon="inline-start" /> Install app</Button>
        ) : isIosDevice ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground"><Share className="mt-0.5 size-4 shrink-0 text-primary" />Tap Share in Safari, then choose <span className="font-medium text-foreground">Add to Home Screen</span>.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Use your browser&apos;s install icon or menu to add JIRANI to this device.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function InstallAppLink() {
  return <InstallApp compact />
}

