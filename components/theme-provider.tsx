"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

type ThemeMode = "light" | "dark" | "system"
type Accent = "emerald" | "blue" | "amber"

type ThemeContextValue = {
  mode: ThemeMode
  accent: Accent
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: Accent) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(mode: ThemeMode, accent: Accent) {
  const root = document.documentElement
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  root.classList.toggle("dark", dark)
  root.dataset.theme = mode
  root.dataset.accent = accent
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system"
    const saved = window.localStorage.getItem("jirani-theme-mode")
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system"
  })
  const [accent, setAccentState] = useState<Accent>(() => {
    if (typeof window === "undefined") return "emerald"
    const saved = window.localStorage.getItem("jirani-theme-accent")
    return saved === "blue" || saved === "amber" || saved === "emerald" ? saved : "emerald"
  })

  useEffect(() => {
    applyTheme(mode, accent)
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => mode === "system" && applyTheme(mode, accent)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [mode, accent])

  const value = useMemo(() => ({
    mode,
    accent,
    setMode: (next: ThemeMode) => { setModeState(next); window.localStorage.setItem("jirani-theme-mode", next) },
    setAccent: (next: Accent) => { setAccentState(next); window.localStorage.setItem("jirani-theme-accent", next) },
  }), [mode, accent])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error("useTheme must be used within ThemeProvider")
  return value
}
