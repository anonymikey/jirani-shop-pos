"use client"

import { useEffect, useRef } from "react"

function Bubble({ index }: { index: number }) {
  const size = 8 + Math.random() * 24
  const left = Math.random() * 100
  const delay = Math.random() * 8
  const duration = 6 + Math.random() * 10
  const opacity = 0.08 + Math.random() * 0.25

  return (
    <div
      className="landing-bubble"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        left: `${left}%`,
        bottom: -20,
        opacity,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  )
}

function GlowOrb({
  size,
  color,
  top,
  left,
  delay,
}: {
  size: number
  color: string
  top: string
  left: string
  delay: number
}) {
  return (
    <div
      className="landing-glow-orb"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        animationDelay: `${delay}s`,
      }}
    />
  )
}

export function AnimatedBubbles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleMouseMove(e: MouseEvent) {
      const { clientX, clientY } = e
      const x = (clientX / window.innerWidth - 0.5) * 2
      const y = (clientY / window.innerHeight - 0.5) * 2

      const orbs = container!.querySelectorAll<HTMLElement>(".landing-glow-orb")
      orbs.forEach((orb, i) => {
        const speed = (i + 1) * 8
        orb.style.transform = `translate(${x * speed}px, ${y * speed}px)`
      })
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div ref={containerRef} className="landing-bg" aria-hidden="true">
      {/* Gradient layers */}
      <div className="landing-gradient" />
      <div className="landing-gradient-radial" />

      {/* Floating orbs */}
      <GlowOrb size={500} color="rgba(34, 197, 94, 0.08)" top="10%" left="20%" delay={0} />
      <GlowOrb size={400} color="rgba(16, 185, 129, 0.06)" top="60%" left="70%" delay={2} />
      <GlowOrb size={300} color="rgba(34, 197, 94, 0.05)" top="30%" left="80%" delay={4} />
      <GlowOrb size={350} color="rgba(20, 184, 166, 0.07)" top="70%" left="15%" delay={1} />
      <GlowOrb size={250} color="rgba(34, 197, 94, 0.04)" top="45%" left="50%" delay={3} />

      {/* Bubbles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <Bubble key={i} index={i} />
      ))}

      {/* Noise texture overlay */}
      <div className="landing-noise" />
    </div>
  )
}
