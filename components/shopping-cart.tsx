"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { formatMoney, useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"

export function ShoppingCartButton() {
  const { items, removeItem, setQuantity } = useCart()
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const titleId = useId()
  const count = items.reduce((total, item) => total + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    }
    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-10 shrink-0"
        onClick={() => setOpen(true)}
      >
        <ShoppingCart />
        Cart
        <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
          {count}
        </span>
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(100%-2rem,28rem)] rounded-xl border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/40"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            setOpen(false)
          }
        }}
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold">
              Shopping cart
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-3 overflow-auto">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.detail}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(item.price)} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Qty {item.quantity}</p>
                      <p className="text-sm font-medium">
                        {formatMoney(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                    >
                      −
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="font-medium">Total</p>
            <p className="text-lg font-semibold">{formatMoney(total)}</p>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-10 w-full"
            disabled={items.length === 0}
            onClick={() => {
              const dialog = dialogRef.current
              if (dialog?.open) {
                dialog.close()
              }
              router.push("/orders")
            }}
          >
            Create order
          </Button>
        </div>
      </dialog>
    </>
  )
}
