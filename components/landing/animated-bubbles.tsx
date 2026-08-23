"use client"

import { useEffect, useRef } from "react"

function Bubble({ index }: { index: number }) {
  const seed = (index * 47 + 19) % 101
  const size = 8 + (seed % 25)
  const left = (seed * 37) % 100
  const delay = (seed * 13) % 8
  const duration = 6 + ((seed * 7) % 11)
  const opacity = 0.08 + ((seed * 11) % 26) / 100

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

/* Floating product SVG illustrations */
const products = [
  {
    id: "bottle-1",
    svg: (
      <svg viewBox="0 0 60 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-product-svg">
        <rect x="22" y="0" width="16" height="20" rx="3" fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.25)" strokeWidth="1"/>
        <path d="M18 20 Q18 30 15 40 L15 120 Q15 135 30 135 Q45 135 45 120 L45 40 Q42 30 42 20 Z" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.2)" strokeWidth="1.5"/>
        <rect x="20" y="50" width="20" height="30" rx="2" fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.18)" strokeWidth="0.8"/>
        <circle cx="30" cy="65" r="6" fill="rgba(34,197,94,0.15)"/>
      </svg>
    ),
    className: "landing-product p1",
  },
  {
    id: "box-1",
    svg: (
      <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-product-svg">
        <path d="M10 25 L50 5 L90 25 L90 75 L50 55 L10 75 Z" fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.2)" strokeWidth="1.5"/>
        <path d="M50 5 L50 55" stroke="rgba(34,197,94,0.15)" strokeWidth="1"/>
        <path d="M10 25 L50 45 L90 25" stroke="rgba(34,197,94,0.12)" strokeWidth="1" fill="none"/>
        <rect x="30" y="30" width="40" height="20" rx="2" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.15)" strokeWidth="0.8"/>
      </svg>
    ),
    className: "landing-product p2",
  },
  {
    id: "can-1",
    svg: (
      <svg viewBox="0 0 50 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-product-svg">
        <ellipse cx="25" cy="10" rx="18" ry="8" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.25)" strokeWidth="1.2"/>
        <rect x="7" y="10" width="36" height="70" rx="0" fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.15)" strokeWidth="1.2"/>
        <ellipse cx="25" cy="80" rx="18" ry="8" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.2)" strokeWidth="1.2"/>
        <rect x="12" y="30" width="26" height="25" rx="2" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.15)" strokeWidth="0.8"/>
        <circle cx="25" cy="42" r="5" fill="rgba(34,197,94,0.12)"/>
      </svg>
    ),
    className: "landing-product p3",
  },
  {
    id: "bottle-2",
    svg: (
      <svg viewBox="0 0 50 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-product-svg">
        <rect x="18" y="0" width="14" height="18" rx="3" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.2)" strokeWidth="1"/>
        <path d="M14 18 Q14 28 10 38 L10 100 Q10 120 25 120 Q40 120 40 100 L40 38 Q36 28 36 18 Z" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.18)" strokeWidth="1.2"/>
        <rect x="14" y="45" width="22" height="35" rx="2" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.12)" strokeWidth="0.8"/>
      </svg>
    ),
    className: "landing-product p4",
  },
  {
    id: "box-2",
    svg: (
      <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-product-svg">
        <rect x="10" y="10" width="60" height="80" rx="4" fill="rgba(34,197,94,0.05)" stroke="rgba(34,197,94,0.18)" strokeWidth="1.2"/>
        <rect x="15" y="15" width="50" height="30" rx="2" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.12)" strokeWidth="0.8"/>
        <rect x="20" y="55" width="40" height="6" rx="1" fill="rgba(34,197,94,0.1)"/>
        <rect x="20" y="66" width="30" height="6" rx="1" fill="rgba(34,197,94,0.08)"/>
        <rect x="20" y="77" width="35" height="6" rx="1" fill="rgba(34,197,94,0.06)"/>
      </svg>
    ),
    className: "landing-product p5",
  },
  {
    id: "bag-1",
    svg: (
      <svg viewBox="0 0 70 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-product-svg">
        <path d="M10 30 Q10 10 35 10 Q60 10 60 30" stroke="rgba(34,197,94,0.2)" strokeWidth="2" fill="none"/>
        <path d="M8 30 L8 80 Q8 88 16 88 L54 88 Q62 88 62 80 L62 30 Z" fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.18)" strokeWidth="1.2"/>
        <rect x="20" y="40" width="30" height="20" rx="2" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.12)" strokeWidth="0.8"/>
        <circle cx="35" cy="50" r="5" fill="rgba(34,197,94,0.1)"/>
      </svg>
    ),
    className: "landing-product p6",
  },
]

function FloatingProduct({ product, mouseRef }: { product: typeof products[0]; mouseRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf: number

    function animate() {
      if (!el) return
      const time = Date.now() * 0.001
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Each product has unique float parameters based on its index
      const idx = products.indexOf(product)
      const dur = 8 + idx * 2
      const phase = (time + idx * 1.5) * (Math.PI * 2 / dur)
      const floatY = Math.sin(phase) * (12 + idx * 3)
      const floatX = Math.cos(phase * 0.6) * (8 + idx * 2)
      const floatRotate = Math.sin(phase * 0.4) * (3 + idx)

      // Mouse parallax (each product responds differently)
      const speed = (idx + 1) * 5

      el.style.transform = `translate(${floatX + mx * speed}px, ${floatY + my * speed}px) rotate(${floatRotate}deg)`

      raf = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(raf)
  }, [product, mouseRef])

  return (
    <div ref={ref} className={product.className} aria-hidden="true">
      {product.svg}
    </div>
  )
}

export function AnimatedBubbles() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
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

      {/* Floating products */}
      {products.map((p) => (
        <FloatingProduct key={p.id} product={p} mouseRef={mouseRef} />
      ))}

      {/* Bubbles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <Bubble key={i} index={i} />
      ))}

      {/* Noise texture overlay */}
      <div className="landing-noise" />
    </div>
  )
}
