"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, ExternalLink, Monitor, Share, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type DeviceType = "ios" | "android" | "desktop" | "other"
type BrowserType = "safari" | "chromium" | "firefox" | "other"

function getDeviceType(): DeviceType {
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isIpadOS = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1
  if (/iphone|ipad|ipod/.test(userAgent) || isIpadOS) return "ios"
  if (/android/.test(userAgent)) return "android"
  if (/windows|macintosh|linux|cros/.test(userAgent)) return "desktop"
  return "other"
}

function getBrowserType(): BrowserType {
  const userAgent = window.navigator.userAgent.toLowerCase()
  if (/firefox|fxios/.test(userAgent)) return "firefox"
  if (/safari/.test(userAgent) && !/chrome|chromium|android/.test(userAgent)) return "safari"
  if (/chrome|chromium|edg\//.test(userAgent)) return "chromium"
  return "other"
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
}

export function InstallApp({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  // Keep the first render identical on the server and client. Browser capabilities
  // are detected after hydration inside the effect below.
  const [installed, setInstalled] = useState(false)
  const [device, setDevice] = useState<DeviceType>("other")
  const [browser, setBrowser] = useState<BrowserType>("other")
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
    const refreshEnvironment = () => {
      setInstalled(isStandalone())
      setDevice(getDeviceType())
      setBrowser(getBrowserType())
    }
    const displayMode = window.matchMedia("(display-mode: standalone)")

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    window.addEventListener("appinstalled", handleInstalled)
    window.addEventListener("resize", refreshEnvironment)
    displayMode.addEventListener("change", refreshEnvironment)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleInstalled)
      window.removeEventListener("resize", refreshEnvironment)
      displayMode.removeEventListener("change", refreshEnvironment)
    }
  }, [])

  const manualInstallAvailable = device === "ios" || browser === "chromium" || browser === "safari"
  const installationMode = promptEvent ? "native" : manualInstallAvailable ? "manual" : "unsupported"

  async function install() {
    if (installed) {
      router.push("/dashboard")
      return
    }
    if (!promptEvent) {
      setShowInstructions(true)
      return
    }
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }

  const instruction = useMemo(() => {
    if (device === "ios") return "In Safari, tap Share, then Add to Home Screen."
    if (device === "android") return "Open your browser menu, then choose Install app or Add to Home screen."
    if (browser === "chromium") return "Select the install icon in the address bar, or open the browser menu and choose Install JIRANI."
    if (browser === "safari") return "In Safari, open the File menu and choose Add to Dock."
    return "Install JIRANI with Safari, Chrome, or Edge for the best experience."
  }, [browser, device])

  const Icon = device === "desktop" ? Monitor : Smartphone
  const title = installed ? "Open JIRANI" : "Install JIRANI"
  const actionLabel = installed ? "Open App" : installationMode === "native" ? "Install App" : "Add to Home Screen"
  const description = device === "ios"
    ? "Add JIRANI to your iPhone or iPad home screen for one-tap access."
    : device === "android"
      ? "Install JIRANI on your Android device for faster sales and reliable shop access."
      : "Keep JIRANI one tap away for faster sales and reliable shop access."

  if (compact) {
    return (
      <>
        <Button type="button" variant="ghost" className="w-full justify-start" onClick={install}>
          {installed ? <ExternalLink data-icon="inline-start" /> : <Download data-icon="inline-start" />}
          {installed ? "Open JIRANI" : "Install JIRANI"}
        </Button>
        {showInstructions && !installed && (
          <p className="px-2 pt-2 text-xs leading-relaxed text-muted-foreground">{instruction}</p>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Icon className="size-5 text-primary" /> {title}</CardTitle>
        <CardDescription>{installed ? "JIRANI is ready to use as an app." : description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={install}>
          {installed ? <ExternalLink data-icon="inline-start" /> : <Download data-icon="inline-start" />}
          {actionLabel}
        </Button>
        {showInstructions && !installed && (
          <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            {device === "ios" && <Share className="mt-0.5 size-4 shrink-0 text-primary" />}
            {instruction}
          </p>
        )}
        {!installed && installationMode === "unsupported" && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Install JIRANI with Safari, Chrome, or Edge for the best experience.</p>
        )}
        {!installed && installationMode === "native" && !showInstructions && (
          <p className="mt-3 text-xs text-muted-foreground">Your browser will show the install dialog.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function InstallAppLink() {
  return <InstallApp compact />
}

            
