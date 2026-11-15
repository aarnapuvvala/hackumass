"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createOrder, type CreateOrderState } from "@/app/actions"
import { formatMoney, useCart, type CartItem } from "@/components/cart-provider"
import { PaymentDialog, type PaidCheckout } from "@/components/payment-dialog"
import { Button } from "@/components/ui/button"

const fieldClassName =
  "h-10 rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function CreateOrderForm() {
  const { items, ready, clear } = useCart()
  const router = useRouter()
  const [address, setAddress] = useState("")
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
  const canPay = ready && items.length > 0 && address.trim() !== ""
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
      onSubmit={(event) => {
        event.preventDefault()
        if (canPay) {
          setPayOpen(true)
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create an order</h1>
        <p className="text-muted-foreground">
          Change the delivery address, then pay to create the order. Sales tax, delivery, and tip
          are added at payment and cannot be charged to EBT.
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
      {state && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="h-10" disabled={pending || !canPay}>
        {pending ? "Creating order…" : "Create order"}
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
        <p className="text-sm font-medium">{totalLabel}</p>
        <p className="text-sm font-semibold">{formatMoney(subtotal)}</p>
      </div>
    </section>
  )
}
