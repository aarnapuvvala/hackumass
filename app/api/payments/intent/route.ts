import { connection } from "next/server"
import { isCheckoutId, MAX_TIP_CENTS, quoteCheckout, type BillableItem } from "@/lib/checkout"
import { getStripe } from "@/lib/stripe"

export async function POST(request: Request) {
  await connection()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid payment request." }, { status: 400 })
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const items = parseItems(record.items)
  const tipCents = record.tipCents
  const ebtCents = record.ebtCents
  const checkoutId = typeof record.checkoutId === "string" ? record.checkoutId : ""
  if (!items || !isCheckoutId(checkoutId)) {
    return Response.json({ error: "The order could not be priced." }, { status: 400 })
  }
  if (
    typeof tipCents !== "number" ||
    !Number.isInteger(tipCents) ||
    tipCents < 0 ||
    tipCents > MAX_TIP_CENTS
  ) {
    return Response.json({ error: "Enter a tip between $0 and $100." }, { status: 400 })
  }
  if (typeof ebtCents !== "number" || !Number.isInteger(ebtCents) || ebtCents < 0) {
    return Response.json({ error: "Enter how much to pay with EBT." }, { status: 400 })
  }

  const quote = quoteCheckout(items, tipCents)
  if (ebtCents > quote.snapCents) {
    return Response.json(
      {
        error:
          "EBT can only pay for SNAP-eligible food. Sales tax, delivery, and tip are charged to the card.",
      },
      { status: 400 }
    )
  }

  const cardCents = quote.grandCents - ebtCents
  if (cardCents < 50) {
    return Response.json(
      { error: "The card has to cover at least $0.50, including delivery." },
      { status: 400 }
    )
  }

  try {
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: cardCents,
      currency: "usd",
      allowed_payment_method_types: ["card"],
      metadata: {
        checkoutId,
        tipCents: String(tipCents),
        ebtCents: String(ebtCents),
        snapCents: String(quote.snapCents),
        grandCents: String(quote.grandCents),
      },
    })
    if (!paymentIntent.client_secret) {
      return Response.json({ error: "The card payment could not be started." }, { status: 500 })
    }
    return Response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error(error)
    const message =
      error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")
        ? error.message
        : "The card payment could not be started. Check the Stripe sandbox keys in .env.local."
    return Response.json({ error: message }, { status: 500 })
  }
}

function parseItems(value: unknown): BillableItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    return null
  }
  const items: BillableItem[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return null
    }
    const item = entry as Record<string, unknown>
    if (
      typeof item.price !== "number" ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      return null
    }
    items.push({
      price: item.price,
      quantity: item.quantity,
      snapEligible: item.snapEligible === true,
    })
  }
  return items
}
