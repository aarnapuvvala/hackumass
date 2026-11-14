"use client"

import { useState } from "react"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ShoppingBagButton() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-10"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ShoppingBag />
        Bag
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border bg-background p-4 shadow-lg">
          <p className="text-sm font-medium">Shopping bag</p>
          <p className="mt-2 text-sm text-muted-foreground">Your bag is empty.</p>
        </div>
      ) : null}
    </div>
  )
}
