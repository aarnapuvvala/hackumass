"use client"

import { useEffect, useId, useRef, useState } from "react"
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import type { CartItem } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import {
  checkoutFrameSource,
  ebtFrameSource,
  MAX_TIP_CENTS,
  parseMoneyToCents,
  quoteCheckout,
  SALES_TAX_RATE,
} from "@/lib/checkout"
import { formatMoney } from "@/lib/utils"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
const stripePromise = publishableKey.startsWith("pk_test_") ? loadStripe(publishableKey) : null

const fieldClassName =
  "h-10 rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#171717",
      fontFamily: "inherit",
      "::placeholder": { color: "#737373" },
    },
    invalid: { color: "#b91c1c" },
  },
}

export type PaidCheckout = {
  checkoutId: string
  paymentIntentId: string
  ebtChargeId: string
  tipCents: number
}

export type PaymentConfirmation = {
  orderId: string
  card: { last4: string; amount: number } | null
  ebt: { last4: string; amount: number; remainingBalance: number } | null
}

type ChargeResult = {
  chargeId: string
  last4: string
  amountCents: number
  remainingBalanceCents: number
}

export function PaymentDialog({
  open,
  items,
  pending,
  error,
  confirmation,
  onClose,
  onPaid,
  onDone,
}: {
  open: boolean
  items: CartItem[]
  pending: boolean
  error: string | null
  confirmation: PaymentConfirmation | null
  onClose: () => void
  onPaid: (payment: PaidCheckout) => void
  onDone: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [checkoutId, setCheckoutId] = useState("")

  useEffect(() => {
    if (open) {
      setCheckoutId(crypto.randomUUID())
    }
  }, [open])

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
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto max-h-[min(100%-2rem,44rem)] w-[min(100%-2rem,32rem)] overflow-auto rounded-xl border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/40"
      onClose={onClose}
      onCancel={(event) => {
        if (pending || confirmation) {
          event.preventDefault()
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending && !confirmation) {
          onClose()
        }
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {confirmation ? "Payment confirmed" : "Pay for this order"}
          </h2>
          {confirmation ? null : (
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
              Close
            </Button>
          )}
        </div>
        {confirmation ? (
          <Confirmation confirmation={confirmation} onDone={onDone} />
        ) : (
          <PayForm
            items={items}
            checkoutId={checkoutId}
            pending={pending}
            error={error}
            onPaid={onPaid}
          />
        )}
      </div>
    </dialog>
  )
}

function Confirmation({
  confirmation,
  onDone,
}: {
  confirmation: PaymentConfirmation
  onDone: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        The order is placed. Keep this receipt. Card numbers are truncated, and the EBT PIN was
        not saved.
      </p>
      {confirmation.card ? (
        <Receipt
          title="Credit card"
          last4={confirmation.card.last4}
          amount={confirmation.card.amount}
          remainingBalance={null}
        />
      ) : null}
      {confirmation.ebt ? (
        <Receipt
          title="EBT"
          last4={confirmation.ebt.last4}
          amount={confirmation.ebt.amount}
          remainingBalance={confirmation.ebt.remainingBalance}
        />
      ) : null}
      <Button type="button" size="lg" className="h-10" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}

function Receipt({
  title,
  last4,
  amount,
  remainingBalance,
}: {
  title: string
  last4: string
  amount: number
  remainingBalance: number | null
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm">Card •••• {last4}</p>
      <p className="text-sm">Amount paid {formatMoney(amount)}</p>
      {remainingBalance == null ? null : (
        <p className="text-sm">Remaining balance {formatMoney(remainingBalance)}</p>
      )}
    </div>
  )
}

function PayForm({
  items,
  checkoutId,
  pending,
  error,
  onPaid,
}: {
  items: CartItem[]
  checkoutId: string
  pending: boolean
  error: string | null
  onPaid: (payment: PaidCheckout) => void
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const waiters = useRef(
    new Map<number, { resolve: (value: ChargeResult) => void; reject: (error: Error) => void }>()
  )
  const [method, setMethod] = useState<"card" | "ebt">("card")
  const [tip, setTip] = useState("0")
  const [ebtAmount, setEbtAmount] = useState("")
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [ebtLast4, setEbtLast4] = useState<string | null>(null)
  const tipCents = parseMoneyToCents(tip)
  const quote = quoteCheckout(items, tipCents ?? 0)
  const ebtCents = method === "card" ? 0 : parseMoneyToCents(ebtAmount)
  const cardCents =
    ebtCents == null ? null : quote.grandCents - (method === "ebt" ? ebtCents : 0)
  const taxLabel = `${(SALES_TAX_RATE * 100).toFixed(2)}% on non-SNAP items`

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) {
        return
      }
      const data = event.data as {
        source?: string
        type?: string
        id?: number
        message?: string
        last4?: string
        balanceCents?: number
        chargeId?: string
        amountCents?: number
        remainingBalanceCents?: number
      }
      if (data?.source !== ebtFrameSource) {
        return
      }
      if (data.type === "balance" && typeof data.balanceCents === "number" && data.last4) {
        setBalanceCents(data.balanceCents)
        setEbtLast4(data.last4)
        setEbtAmount((current) => {
          if (current.trim()) {
            return current
          }
          const cap = Math.min(quote.snapCents, data.balanceCents ?? 0)
          return (cap / 100).toFixed(2)
        })
        return
      }
      if (typeof data.id !== "number") {
        return
      }
      const waiter = waiters.current.get(data.id)
      if (!waiter) {
        return
      }
      waiters.current.delete(data.id)
      if (
        data.type === "charged" &&
        data.chargeId &&
        data.last4 &&
        typeof data.amountCents === "number" &&
        typeof data.remainingBalanceCents === "number"
      ) {
        waiter.resolve({
          chargeId: data.chargeId,
          last4: data.last4,
          amountCents: data.amountCents,
          remainingBalanceCents: data.remainingBalanceCents,
        })
        return
      }
      waiter.reject(new Error(data.message || "EBT payment failed."))
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [quote.snapCents])

  function requestEbtCharge(amountCents: number) {
    const id = Date.now()
    return new Promise<ChargeResult>((resolve, reject) => {
      waiters.current.set(id, { resolve, reject })
      frameRef.current?.contentWindow?.postMessage(
        {
          source: checkoutFrameSource,
          type: "charge",
          id,
          amountCents,
          checkoutId,
        },
        window.location.origin
      )
      window.setTimeout(() => {
        if (!waiters.current.has(id)) {
          return
        }
        waiters.current.delete(id)
        reject(new Error("Enter the EBT card number and PIN in the secure field, then try again."))
      }, 20000)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-sm">
        <Row label="SNAP-eligible food" value={money(quote.snapCents)} />
        <Row label="Other items" value={money(quote.otherCents)} />
        <Row label={`Sales tax (${taxLabel})`} value={money(quote.taxCents)} />
        <Row label="Delivery fee" value={money(quote.deliveryCents)} />
        <Row label="Tip" value={tipCents == null ? "—" : money(tipCents)} />
      </div>
      {quote.grandCents === 0 ? (
        <p className="text-sm text-muted-foreground">This order is free. Nothing is charged.</p>
      ) : (
      <p className="text-sm text-muted-foreground">
        Sales tax, the delivery fee, and the tip are never charged to EBT. Those amounts, plus
        anything SNAP does not cover, go on the credit card.
      </p>
      )}
      {quote.grandCents === 0 ? null : (
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Tip
        <input
          value={tip}
          onChange={(event) => setTip(event.target.value)}
          inputMode="decimal"
          className={fieldClassName}
        />
      </label>
      )}
      {quote.grandCents === 0 ? null : (
      <div className="flex gap-2">
        {["0", "2", "3", "5"].map((amount) => (
          <Button
            key={amount}
            type="button"
            variant={tip === amount ? "secondary" : "outline"}
            size="sm"
            onClick={() => setTip(amount)}
          >
            ${amount}
          </Button>
        ))}
      </div>
      )}
      {quote.grandCents === 0 ? (
        <Button
          type="button"
          size="lg"
          className="h-10"
          disabled={pending || !checkoutId}
          onClick={() =>
            onPaid({
              checkoutId,
              paymentIntentId: "",
              ebtChargeId: "",
              tipCents: 0,
            })
          }
        >
          {pending ? "Placing order…" : "Place free order"}
        </Button>
      ) : (
      <>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Payment method</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="payment-method"
            checked={method === "card"}
            onChange={() => setMethod("card")}
          />
          Credit card for the full order
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="payment-method"
            checked={method === "ebt"}
            onChange={() => setMethod("ebt")}
          />
          EBT / SNAP, with the rest on a credit card
        </label>
      </fieldset>
      <div className={method === "ebt" ? "flex flex-col gap-3" : "hidden"}>
        <iframe
          ref={frameRef}
          title="Secure EBT card and PIN"
          src="/ebt/secure"
          className="h-72 w-full rounded-lg border border-border bg-white"
        />
        <p className="text-xs text-muted-foreground">
          EBT cards have no expiration date, CVV, or ZIP code. The sandbox accepts any 4-digit PIN.
          A new card starts with a {money(20000)} balance. Check the balance, then enter the PIN
          again before paying.
        </p>
        {balanceCents != null ? (
          <p className="text-sm">
            EBT •••• {ebtLast4} balance {money(balanceCents)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Balance has not been checked yet.</p>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Amount to pay with EBT
          <input
            value={ebtAmount}
            onChange={(event) => setEbtAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className={fieldClassName}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Maximum EBT amount is {money(quote.snapCents)}, the SNAP-eligible food.
        </p>
      </div>
      {stripePromise ? (
        <Elements stripe={stripePromise}>
          <CardPayment
            items={items}
            checkoutId={checkoutId}
            pending={pending}
            error={error}
            onPaid={onPaid}
            method={method}
            tipCents={tipCents}
            ebtCents={ebtCents}
            cardCents={cardCents}
            snapCents={quote.snapCents}
            balanceCents={balanceCents}
            requestEbtCharge={requestEbtCharge}
            resetEbt={() => {
              frameRef.current?.contentWindow?.postMessage(
                { source: checkoutFrameSource, type: "reset" },
                window.location.origin
              )
            }}
          />
        </Elements>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-destructive" role="alert">
            Add the Stripe sandbox publishable key as NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in
            .env.local, then restart the app. The card still has to pay delivery, tax, and tip.
          </p>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="font-medium">Charge to card</p>
            <p className="text-lg font-semibold">{cardCents == null ? "—" : money(cardCents)}</p>
          </div>
          <Button type="button" size="lg" className="h-10" disabled>
            Pay and place order
          </Button>
        </div>
      )}
      </>
      )}
    </div>
  )
}

function CardPayment({
  items,
  checkoutId,
  pending,
  error,
  onPaid,
  method,
  tipCents,
  ebtCents,
  cardCents,
  snapCents,
  balanceCents,
  requestEbtCharge,
  resetEbt,
}: {
  items: CartItem[]
  checkoutId: string
  pending: boolean
  error: string | null
  onPaid: (payment: PaidCheckout) => void
  method: "card" | "ebt"
  tipCents: number | null
  ebtCents: number | null
  cardCents: number | null
  snapCents: number
  balanceCents: number | null
  requestEbtCharge: (amountCents: number) => Promise<ChargeResult>
  resetEbt: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending) {
      setSubmitting(false)
    }
    wasPending.current = pending
  }, [pending])

  async function pay() {
    setLocalError(null)
    if (!stripe || !elements || !checkoutId) {
      setLocalError("Card payment is still loading.")
      return
    }
    const card = elements.getElement(CardElement)
    if (!card) {
      setLocalError("Enter the credit card.")
      return
    }
    if (tipCents == null || tipCents > MAX_TIP_CENTS) {
      setLocalError("Enter a tip between $0 and $100.")
      return
    }
    if (method === "ebt") {
      if (snapCents <= 0) {
        setLocalError("Nothing in this order can be paid with SNAP. Pay with a credit card.")
        return
      }
      if (ebtCents == null || ebtCents <= 0) {
        setLocalError("Enter the exact amount to pay with EBT.")
        return
      }
      if (ebtCents > snapCents) {
        setLocalError("EBT can only cover SNAP-eligible food. Fees and tax stay on the card.")
        return
      }
      if (balanceCents != null && ebtCents > balanceCents) {
        setLocalError("That amount is higher than the EBT balance.")
        return
      }
    }
    if (cardCents == null || cardCents < 50) {
      setLocalError("The card has to cover delivery, tax, tip, and anything EBT does not pay.")
      return
    }

    setSubmitting(true)
    let ebtChargeId = ""
    try {
      if (method === "ebt" && ebtCents) {
        const charged = await requestEbtCharge(ebtCents)
        ebtChargeId = charged.chargeId
      }

      const intentResponse = await fetch("/api/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            price: item.price,
            quantity: item.quantity,
            snapEligible: item.snapEligible,
          })),
          tipCents,
          ebtCents: method === "ebt" ? ebtCents : 0,
          checkoutId,
        }),
      })
      const intent = (await intentResponse.json()) as {
        error?: string
        clientSecret?: string
        paymentIntentId?: string
      }
      if (!intentResponse.ok || !intent.clientSecret || !intent.paymentIntentId) {
        throw new Error(intent.error || "The card payment could not be started.")
      }

      const confirmed = await stripe.confirmCardPayment(intent.clientSecret, {
        payment_method: { card },
      })
      if (confirmed.error || !confirmed.paymentIntent) {
        throw new Error(confirmed.error?.message || "The card was declined.")
      }

      onPaid({
        checkoutId,
        paymentIntentId: confirmed.paymentIntent.id,
        ebtChargeId,
        tipCents,
      })
    } catch (payError) {
      if (ebtChargeId) {
        await fetch("/api/ebt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "void", chargeId: ebtChargeId, checkoutId }),
        }).catch(() => undefined)
        resetEbt()
      }
      setLocalError(payError instanceof Error ? payError.message : "Payment failed.")
      setSubmitting(false)
    }
  }

  const busy = submitting || pending
  const message = localError || error

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Credit card</p>
        <div className="rounded-lg border border-input bg-background px-3 py-3">
          <CardElement options={cardElementOptions} />
        </div>
        <p className="text-xs text-muted-foreground">
          Stripe sandbox test card 4242 4242 4242 4242, any future expiration, any CVC, and any ZIP.
        </p>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="font-medium">Charge to card</p>
          <p className="text-lg font-semibold">{cardCents == null ? "—" : money(cardCents)}</p>
        </div>
      </div>
      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
      <Button type="button" size="lg" className="h-10" disabled={busy || !stripe} onClick={() => void pay()}>
        {busy ? "Processing payment…" : "Pay and place order"}
      </Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function money(cents: number) {
  return formatMoney(cents / 100)
}
