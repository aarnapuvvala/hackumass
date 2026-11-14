"use client"

import { useActionState, useEffect, useState } from "react"
import Link from "next/link"
import { createOrder, type CreateOrderState } from "@/app/actions"
import { formatMoney, useCart } from "@/components/cart-provider"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const fieldClassName =
  "h-10 rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function CreateOrderForm() {
  const { items, clear, ready } = useCart()
  const [address, setAddress] = useState("")
  const [state, formAction, pending] = useActionState<CreateOrderState, FormData>(
    createOrder,
    null
  )
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const pickups = [...new Set(items.map((item) => item.pickup).filter(Boolean))]

  useEffect(() => {
    if (state?.ok) {
      clear()
    }
  }, [state, clear])

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Order created</h1>
          <p className="text-muted-foreground">
            Your order will be delivered to {state.address}.
          </p>
        </div>
        <Link
          href="/customer_account"
          className={cn(buttonVariants({ size: "lg" }), "h-10 w-full")}
        >
          Back to stores
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create an order</h1>
        <p className="text-muted-foreground">
          Change the delivery address, then create the order.
        </p>
      </div>
      {pickups.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Starting point</p>
          {pickups.map((pickup) => (
            <p key={pickup} className="text-sm text-muted-foreground">
              {pickup}
            </p>
          ))}
        </div>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Qty {item.quantity}</p>
                <p className="text-sm font-medium">{formatMoney(item.price * item.quantity)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Total</p>
        <p className="text-lg font-semibold">{formatMoney(total)}</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Delivery address
        <input
          name="address"
          type="text"
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          autoComplete="street-address"
          placeholder="123 Main St, Amherst, MA"
          className={fieldClassName}
        />
      </label>
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="h-10"
        disabled={pending || !ready || items.length === 0 || address.trim() === ""}
      >
        {pending ? "Creating order…" : "Create order"}
      </Button>
    </form>
  )
}
