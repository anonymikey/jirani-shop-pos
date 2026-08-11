"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { getOfflineOperations } from "@/lib/offline-queue"

export function SyncStatus() {
  const [online, setOnline] = useState(true)
  const [queued, setQueued] = useState(0)
  useEffect(() => {
    const refresh = () => { setOnline(navigator.onLine); getOfflineOperations().then((items) => setQueued(items.length)).catch(() => undefined) }
    refresh()
    window.addEventListener("online", refresh)
    window.addEventListener("offline", refresh)
    return () => { window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh) }
  }, [])
  return <Badge variant={online ? "outline" : "secondary"}>{online ? "Online" : "Offline"}{queued > 0 ? ` · ${queued} queued` : ""}</Badge>
}
