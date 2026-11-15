export const DELIVERY_FEE_CENTS = 499
export const SALES_TAX_RATE = 0.0625
export const MAX_TIP_CENTS = 10_000
export const EBT_STARTING_BALANCE_CENTS = 20_000

export const ebtFrameSource = "hackumass-ebt"
export const checkoutFrameSource = "hackumass-checkout"

export type BillableItem = {
  price: number
  quantity: number
  snapEligible: boolean
}

export type CheckoutQuote = {
  snapCents: number
  otherCents: number
  taxCents: number
  deliveryCents: number
  tipCents: number
  grandCents: number
}

export function lineCents(price: number, quantity: number) {
  return Math.round(price * 100) * quantity
}

export function quoteCheckout(items: BillableItem[], tipCents: number): CheckoutQuote {
  const snapCents = items
    .filter((item) => item.snapEligible)
    .reduce((sum, item) => sum + lineCents(item.price, item.quantity), 0)
  const otherCents = items
    .filter((item) => !item.snapEligible)
    .reduce((sum, item) => sum + lineCents(item.price, item.quantity), 0)
  const taxCents = Math.round(otherCents * SALES_TAX_RATE)
  const complimentary = snapCents + otherCents === 0
  const deliveryCents = !complimentary && items.length > 0 ? DELIVERY_FEE_CENTS : 0
  const tip =
    complimentary || !Number.isInteger(tipCents)
      ? 0
      : Math.min(Math.max(tipCents, 0), MAX_TIP_CENTS)
  return {
    snapCents,
    otherCents,
    taxCents,
    deliveryCents,
    tipCents: tip,
    grandCents: snapCents + otherCents + taxCents + deliveryCents + tip,
  }
}

export function parseMoneyToCents(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    return null
  }
  const cents = Math.round(Number(trimmed) * 100)
  if (!Number.isInteger(cents) || cents < 0) {
    return null
  }
  return cents
}

export function isCheckoutId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}
