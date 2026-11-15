import Stripe from "stripe"

let stripe: Stripe | null = null

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY ?? ""
}

export function stripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
}

export function getStripe() {
  const key = stripeSecretKey()
  if (!key.startsWith("sk_test_")) {
    throw new Error("Add the Stripe sandbox secret key as STRIPE_SECRET_KEY in .env.local.")
  }
  if (!stripe) {
    stripe = new Stripe(key)
  }
  return stripe
}

export async function refundPayment(paymentIntentId: string) {
  const stripeClient = getStripe()
  const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId)
  if (paymentIntent.status === "succeeded") {
    const refunds = await stripeClient.refunds.list({ payment_intent: paymentIntentId, limit: 1 })
    if (refunds.data.length === 0) {
      await stripeClient.refunds.create({ payment_intent: paymentIntentId })
    }
    return
  }
  if (
    paymentIntent.status === "requires_payment_method" ||
    paymentIntent.status === "requires_confirmation" ||
    paymentIntent.status === "requires_action" ||
    paymentIntent.status === "requires_capture"
  ) {
    await stripeClient.paymentIntents.cancel(paymentIntentId)
  }
}

export function cardLast4(paymentIntent: Stripe.PaymentIntent) {
  const method = paymentIntent.payment_method
  if (method && typeof method !== "string") {
    return method.card?.last4 ?? null
  }
  const charge = paymentIntent.latest_charge
  if (charge && typeof charge !== "string") {
    return charge.payment_method_details?.card?.last4 ?? null
  }
  return null
}
