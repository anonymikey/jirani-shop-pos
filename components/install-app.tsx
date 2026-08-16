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
  const [showInstructions, setShowInstructions] = useState(false)

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
    if (!promptEvent) {
      setShowInstructions(true)
      return
    }
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }

  function instructions() {
    if (device === "ios") return "In Safari, tap Share, then Add to Home Screen."
    if (device === "android") return "Open your browser menu, then choose Install app or Add to Home screen."
    return "Use your browser's install icon in the address bar or open the browser menu and choose Install JIRANI."
  }

  if (installed) return null

  if (compact) {
    return (
      <>
        <Button type="button" variant="ghost" className="w-full justify-start" onClick={install}>
          <Download data-icon="inline-start" />
          Add JIRANI to Home
        </Button>
        {showInstructions && <p className="px-2 pt-2 text-xs leading-relaxed text-muted-foreground">{instructions()}</p>}
      </>
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
        <Button type="button" onClick={install}><Download data-icon="inline-start" /> Add to Home Screen</Button>
        {showInstructions && (
          <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            {isIosDevice && <Share className="mt-0.5 size-4 shrink-0 text-primary" />}
            {instructions()}
          </p>
        )}
        {!promptEvent && !showInstructions && (
          <p className="mt-3 text-xs text-muted-foreground">Your browser will show the install dialog when supported.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function InstallAppLink() {
  return <InstallApp compact />
}

