"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { ReactLenis, useLenis } from "lenis/react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import "lenis/dist/lenis.css"

gsap.registerPlugin(ScrollTrigger)

function GsapLenisSync() {
  const lenis = useLenis()
  const pathname = usePathname()

  useEffect(() => {
    if (!lenis) {
      return
    }

    const onScroll = () => {
      ScrollTrigger.update()
    }
    lenis.on("scroll", onScroll)

    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.off("scroll", onScroll)
      gsap.ticker.remove(tick)
    }
  }, [lenis])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname])

  return null
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith("/ebt")) {
    return children
  }

  return (
    <ReactLenis
      root
      autoRaf={false}
      options={{
        autoRaf: false,
        lerp: 0.1,
        anchors: { offset: 88 },
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
        autoToggle: true,
      }}
    >
      <GsapLenisSync />
      {children}
    </ReactLenis>
  )
}
