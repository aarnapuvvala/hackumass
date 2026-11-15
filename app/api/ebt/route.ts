import { connection } from "next/server"
import { isCheckoutId } from "@/lib/checkout"
import {
  chargeEbt,
  checkEbtBalance,
  getEbtCharge,
  readPan,
  readPin,
  reverseEbtCharge,
} from "@/lib/ebt"

export async function POST(request: Request) {
  await connection()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid payment request." }, { status: 400 })
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  if (record.action === "balance") {
    const pan = readPan(record.pan)
    const pin = readPin(record.pin)
    if (!pan || !pin) {
      return Response.json(
        { error: "Enter a 16–19 digit EBT card number and a 4-digit PIN." },
        { status: 400 }
      )
    }
    const result = await checkEbtBalance(pan, pin)
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 })
    }
    return Response.json({ last4: result.last4, balanceCents: result.balanceCents })
  }

  if (record.action === "charge") {
    const checkoutId = typeof record.checkoutId === "string" ? record.checkoutId : ""
    const pan = readPan(record.pan)
    const pin = readPin(record.pin)
    const amountCents = record.amountCents
    if (!isCheckoutId(checkoutId) || !pan || !pin || typeof amountCents !== "number") {
      return Response.json(
        { error: "Enter a 16–19 digit EBT card number and a 4-digit PIN." },
        { status: 400 }
      )
    }
    const result = await chargeEbt({ pan, pin, amountCents, checkoutId })
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 })
    }
    return Response.json({
      chargeId: result.chargeId,
      last4: result.last4,
      amountCents: result.amountCents,
      remainingBalanceCents: result.remainingBalanceCents,
    })
  }

  if (record.action === "void") {
    const chargeId = typeof record.chargeId === "string" ? record.chargeId : ""
    const checkoutId = typeof record.checkoutId === "string" ? record.checkoutId : ""
    const charge = chargeId ? await getEbtCharge(chargeId) : null
    if (!charge || charge.checkoutId !== checkoutId || charge.consumed || charge.voided) {
      return Response.json({ error: "That EBT payment could not be canceled." }, { status: 400 })
    }
    await reverseEbtCharge(chargeId)
    return Response.json({ ok: true })
  }

  return Response.json({ error: "Unknown EBT action." }, { status: 400 })
}
