"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { formatMoney, useCart, type CartItem } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"

export function ShoppingCartButton({ groupBySnap = false }: { groupBySnap?: boolean }) {
  const { items, removeItem, setQuantity } = useCart()
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const titleId = useId()
  const count = items.reduce((total, item) => total + item.quantity, 0)
  const snapItems = items.filter((item) => item.snapEligible)
  const otherItems = items.filter((item) => !item.snapEligible)
  const snapTotal = snapItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const otherTotal = otherItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = snapTotal + otherTotal

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
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
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
          ) : groupBySnap ? (
            <div className="flex max-h-80 flex-col gap-5 overflow-auto">
              <CartGroup
                title="SNAP eligible"
                totalLabel="SNAP total"
                items={snapItems}
                subtotal={snapTotal}
                setQuantity={setQuantity}
                removeItem={removeItem}
              />
              <CartGroup
                title="Not SNAP eligible"
                totalLabel="Other total"
                items={otherItems}
                subtotal={otherTotal}
                setQuantity={setQuantity}
                removeItem={removeItem}
              />
            </div>
          ) : (
            <ul className="flex max-h-80 flex-col gap-3 overflow-auto">
              {items.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  setQuantity={setQuantity}
                  removeItem={removeItem}
                />
              ))}
            </ul>
          )}
          {groupBySnap ? null : (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <p className="font-medium">Total</p>
              <p className="text-lg font-semibold">{formatMoney(total)}</p>
            </div>
          )}
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

function CartGroup({
  title,
  totalLabel,
  items,
  subtotal,
  setQuantity,
  removeItem,
}: {
  title: string
  totalLabel: string
  items: CartItem[]
  subtotal: number
  setQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <CartLine
              key={item.id}
              item={item}
              setQuantity={setQuantity}
              removeItem={removeItem}
            />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
        <p className="text-sm font-medium">{totalLabel}</p>
        <p className="text-sm font-semibold">{formatMoney(subtotal)}</p>
      </div>
    </section>
  )
}

function CartLine({
  item,
  setQuantity,
  removeItem,
}: {
  item: CartItem
  setQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
}) {
  return (
    <li className="surface flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">{item.detail}</p>
          <p className="text-sm text-muted-foreground">
            {item.price === 0 ? "Free" : `${formatMoney(item.price)} each`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">Qty {item.quantity}</p>
          <p className="text-sm font-medium">
            {item.price === 0 ? "Free" : formatMoney(item.price * item.quantity)}
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
        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
          Remove
        </Button>
      </div>
    </li>
  )
}
