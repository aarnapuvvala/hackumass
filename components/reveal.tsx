"use client"

import { useRef, type ReactNode } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "gsap"

type Tag = "div" | "h1" | "p" | "section"

export function Reveal({
  as,
  className,
  children,
  delay = 0,
}: {
  as?: Tag
  className?: string
  children: ReactNode
  delay?: number
}) {
  const TagName = as ?? "div"
  const ref = useRef<HTMLElement>(null)

  useGSAP(() => {
    const element = ref.current
    if (!element) {
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }
    gsap.from(element, {
      y: 16,
      autoAlpha: 0,
      duration: 0.75,
      delay,
      ease: "power3.out",
    })
  })

  return (
    <TagName ref={ref as never} className={className}>
      {children}
    </TagName>
  )
}
