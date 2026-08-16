"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let registration: ServiceWorkerRegistration | undefined

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        await registration.update()

        registration.addEventListener("updatefound", () => {
          const worker = registration?.installing
          if (!worker) return
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" })
            }
          })
        })
      } catch {
        // PWA support is optional; the web app remains fully usable.
      }
    }

    void register()
    const updateTimer = window.setInterval(() => void registration?.update(), 60 * 60 * 1000)
    const refreshOnReturn = () => void registration?.update()
    document.addEventListener("visibilitychange", refreshOnReturn)

    return () => {
      if (updateTimer) window.clearInterval(updateTimer)
      document.removeEventListener("visibilitychange", refreshOnReturn)
    }
  }, [])

  return null
}
