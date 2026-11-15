"use client"

import { useRef } from "react"
import { Store, Truck, UserRound } from "lucide-react"
import { useGSAP } from "@gsap/react"
import { gsap } from "gsap"
import { selectRole } from "@/app/actions"
import Aurora from "@/components/Aurora"
import BlurText from "@/components/BlurText"
import { PageFrame } from "@/components/page-frame"
import { Reveal } from "@/components/reveal"
import SpotlightCard from "@/components/SpotlightCard"
import { Button } from "@/components/ui/button"

const roles = [
  {
    role: "customer",
    title: "Customer",
    description: "Order as a guest, or sign in to save your information.",
    icon: UserRound,
  },
  {
    role: "driver",
    title: "Driver",
    description: "Sign in with a username and password to take deliveries.",
    icon: Truck,
  },
  {
    role: "store",
    title: "Store",
    description: "Sign in with your store name and password to edit the menu.",
    icon: Store,
  },
] as const

export function HomeHero() {
  const cardsRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return
      }
      gsap.from("[data-role-card]", {
        y: 28,
        autoAlpha: 0,
        duration: 0.8,
        stagger: 0.12,
        delay: 0.2,
        ease: "power3.out",
      })
    },
    { scope: cardsRef }
  )

  return (
    <div className="relative isolate">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(ellipse_at_top,oklch(0.9_0.05_145),transparent_62%)]"
        aria-hidden="true"
      >
        <Aurora
          lightMode
          colorStops={["#b7d7a4", "#2f7a4f", "#10281c"]}
          amplitude={1}
          blend={0.7}
          speed={0.45}
          height={0.62}
          brightness={1.15}
          opacity={1}
          layers={2}
          mouseInteraction
        />
      </div>
      <PageFrame width="xl" className="justify-center py-16">
        <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex max-w-xl flex-col gap-4">
            <p className="text-sm font-medium text-primary">Grocery & Meal Delivery</p>
            <Reveal as="h1" className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Choose a Role
            </Reveal>
            <BlurText
              text="Pick how you want to continue. This visit remembers the role you choose."
              className="text-lg text-muted-foreground"
              animateBy="words"
              trigger="load"
              delay={45}
              blur={8}
              distance={14}
              direction="bottom"
            />
          </div>
          <div ref={cardsRef} className="grid gap-3">
            {roles.map(({ role, title, description, icon: Icon }) => (
              <form key={role} action={selectRole} data-role-card>
                <input type="hidden" name="role" value={role} />
                <SpotlightCard
                  theme="light"
                  spotlightColor="#1d4a36"
                  intensity={0.45}
                  spotlightSize={220}
                  softness={0.8}
                  className="p-0"
                  style={{ padding: 0 }}
                >
                  <Button
                    type="submit"
                    variant="ghost"
                    className="h-auto w-full items-start justify-start gap-4 rounded-[inherit] bg-transparent p-5 text-left whitespace-normal hover:bg-transparent"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-base font-semibold">{title}</span>
                      <span className="text-sm font-normal text-pretty text-muted-foreground">
                        {description}
                      </span>
                    </span>
                  </Button>
                </SpotlightCard>
              </form>
            ))}
          </div>
        </div>
      </PageFrame>
    </div>
  )
}
