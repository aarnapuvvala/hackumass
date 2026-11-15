"use client"

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createOrder, type CreateOrderState } from "@/app/actions"
import { formatMoney, useCart, type CartItem } from "@/components/cart-provider"
import { PaymentDialog, type PaidCheckout } from "@/components/payment-dialog"
import { Button } from "@/components/ui/button"

export function CreateOrderForm() {
  const { items, ready, clear } = useCart()
  const router = useRouter()
  const [address, setAddress] = useState("")
  const [clientError, setClientError] = useState<string | null>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [hiddenOrderId, setHiddenOrderId] = useState<string | null>(null)
  const seenOrder = useRef<string | null>(null)
  const [state, formAction, pending] = useActionState<CreateOrderState, FormData>(
    createOrder,
    null
  )
  const snapItems = items.filter((item) => item.snapEligible)
  const otherItems = items.filter((item) => !item.snapEligible)
  const snapTotal = snapItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const otherTotal = otherItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = snapTotal + otherTotal
  const pickups = [...new Set(items.map((item) => item.pickup).filter(Boolean))]
  const confirmation =
    state?.ok && hiddenOrderId !== state.orderId
      ? { orderId: state.orderId, card: state.card, ebt: state.ebt }
      : null

  useEffect(() => {
    if (!state?.ok || seenOrder.current === state.orderId) {
      return
    }
    seenOrder.current = state.orderId
    clear()
  }, [clear, state])

  function placeOrder(payment: PaidCheckout) {
    const formData = new FormData()
    formData.set("address", address)
    formData.set("items", JSON.stringify(items))
    formData.set("checkoutId", payment.checkoutId)
    formData.set("paymentIntentId", payment.paymentIntentId)
    formData.set("ebtChargeId", payment.ebtChargeId)
    formData.set("tipCents", String(payment.tipCents))
    formAction(formData)
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!ready) {
          setClientError("Your cart is still loading…")
          return
        }
        if (items.length === 0) {
          setClientError("Add items to your cart, then come back to place the order.")
          return
        }
        if (!address.trim()) {
          setClientError("Enter a delivery address so the driver knows where to stop.")
          addressRef.current?.focus()
          return
        }
        setClientError(null)
        setPayOpen(true)
      }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Create an Order</h1>
        <p className="text-pretty text-muted-foreground">
          Confirm the delivery address, then pay to place the order. Sales tax, delivery, and tip
          are added at payment and stay off EBT.
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
        <div className="flex flex-col gap-5">
          <OrderGroup title="SNAP eligible" totalLabel="SNAP total" items={snapItems} subtotal={snapTotal} />
          <OrderGroup title="Not SNAP eligible" totalLabel="Other total" items={otherItems} subtotal={otherTotal} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="font-medium">Order total</p>
        <p className="text-lg font-semibold tabular-nums">{formatMoney(total)}</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Delivery address
        <input
          ref={addressRef}
          name="address"
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          autoComplete="street-address"
          placeholder="123 Main St, Amherst, MA…"
          aria-invalid={clientError?.includes("address") ? true : undefined}
          className="field"
        />
      </label>
      {clientError ? (
        <p className="text-sm text-destructive" role="alert">
          {clientError}
        </p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Creating order…" : "Continue to Payment"}
      </Button>
      <PaymentDialog
        open={payOpen || confirmation != null}
        items={items}
        pending={pending}
        error={state && !state.ok ? state.error : null}
        confirmation={confirmation}
        onClose={() => setPayOpen(false)}
        onPaid={placeOrder}
        onDone={() => {
          if (state?.ok) {
            setHiddenOrderId(state.orderId)
          }
          setPayOpen(false)
          router.push("/customer_account")
        }}
      />
    </form>
  )
}

function OrderGroup({
  title,
  totalLabel,
  items,
  subtotal,
}: {
  title: string
  totalLabel: string
  items: CartItem[]
  subtotal: number
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="surface flex items-start justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="break-words font-medium">{item.name}</p>
                <p className="break-words text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-sm font-medium">Qty {item.quantity}</p>
                <p className="text-sm font-medium">
                  {item.price === 0 ? "Free" : formatMoney(item.price * item.quantity)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{totalLabel}</p>
        <p className="text-sm font-semibold tabular-nums">{formatMoney(subtotal)}</p>
      </div>
    </section>
  )
}
