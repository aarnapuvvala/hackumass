import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const widths = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
} as const

export function PageFrame({
  children,
  width = "sm",
  className,
}: {
  children: ReactNode
  width?: keyof typeof widths
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-8 px-5 py-10 sm:px-6",
        widths[width],
        className
      )}
    >
      {children}
    </div>
  )
}

export function PageIntro({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        {kicker ? <p className="text-sm font-medium text-primary">{kicker}</p> : null}
        <h1 className="break-words text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <div className="text-pretty text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}
