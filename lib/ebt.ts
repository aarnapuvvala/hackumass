import { createHmac, randomUUID } from "node:crypto"
import { EBT_STARTING_BALANCE_CENTS } from "@/lib/checkout"
import { migrateJsonData } from "@/lib/json-migrate"
import { mongoCollection } from "@/lib/mongo"

type ChargeRecord = {
  id: string
  token: string
  checkoutId: string
  last4: string
  amountCents: number
  remainingBalanceCents: number
  voided: boolean
  consumed: boolean
}

function cardToken(pan: string) {
  const secret = process.env.STRIPE_SECRET_KEY || "ebt-sandbox-ledger"
  return createHmac("sha256", secret).update(pan).digest("hex")
}

export function readPan(value: unknown) {
  if (typeof value !== "string") {
    return null
  }
  const digits = value.replace(/\D/g, "")
  if (!/^\d{16,19}$/.test(digits)) {
    return null
  }
  return digits
}

export function readPin(value: unknown) {
  if (typeof value !== "string") {
    return null
  }
  const digits = value.replace(/\D/g, "")
  if (!/^\d{4}$/.test(digits)) {
    return null
  }
  return digits
}

async function balances() {
  await migrateJsonData()
  return mongoCollection<{ _id: string; cents: number }>("ebtBalances")
}

async function charges() {
  await migrateJsonData()
  return mongoCollection<ChargeRecord & { _id: string }>("ebtCharges")
}

async function ensureBalance(token: string) {
  const collection = await balances()
  await collection.updateOne(
    { _id: token },
    { $setOnInsert: { cents: EBT_STARTING_BALANCE_CENTS } },
    { upsert: true }
  )
  const record = await collection.findOne({ _id: token })
  return typeof record?.cents === "number" && record.cents >= 0
    ? record.cents
    : EBT_STARTING_BALANCE_CENTS
}

export async function checkEbtBalance(pan: string, pin: string) {
  if (!readPin(pin) || !readPan(pan)) {
    return { ok: false as const, error: "Enter an EBT card number and a 4-digit PIN." }
  }
  const balanceCents = await ensureBalance(cardToken(pan))
  return {
    ok: true as const,
    last4: pan.slice(-4),
    balanceCents,
  }
}

export async function chargeEbt(input: {
  pan: string
  pin: string
  amountCents: number
  checkoutId: string
}) {
  if (!readPin(input.pin) || !readPan(input.pan)) {
    return { ok: false as const, error: "Enter an EBT card number and a 4-digit PIN." }
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { ok: false as const, error: "Enter how much to pay with EBT." }
  }

  const token = cardToken(input.pan)
  await ensureBalance(token)
  const collection = await balances()
  const updated = await collection.findOneAndUpdate(
    { _id: token, cents: { $gte: input.amountCents } },
    { $inc: { cents: -input.amountCents } },
    { returnDocument: "after" }
  )
  if (!updated) {
    const current = await ensureBalance(token)
    return {
      ok: false as const,
      error: `The EBT balance is too low for that amount. Remaining balance ${formatLedgerMoney(current)}.`,
    }
  }

  const remainingBalanceCents = updated.cents
  const charge: ChargeRecord = {
    id: randomUUID(),
    token,
    checkoutId: input.checkoutId,
    last4: input.pan.slice(-4),
    amountCents: input.amountCents,
    remainingBalanceCents,
    voided: false,
    consumed: false,
  }
  try {
    await (await charges()).insertOne({ ...charge, _id: charge.id })
  } catch (error) {
    await collection.updateOne({ _id: token }, { $inc: { cents: input.amountCents } })
    throw error
  }
  return {
    ok: true as const,
    chargeId: charge.id,
    last4: charge.last4,
    amountCents: charge.amountCents,
    remainingBalanceCents,
  }
}

export async function getEbtCharge(chargeId: string) {
  const charge = await (await charges()).findOne({ _id: chargeId })
  if (!charge) {
    return null
  }
  const { _id, ...record } = charge
  return record
}

export async function consumeEbtCharge(chargeId: string) {
  const result = await (await charges()).updateOne(
    { _id: chargeId, voided: { $ne: true } },
    { $set: { consumed: true } }
  )
  return result.matchedCount === 1
}

export async function reverseEbtCharge(chargeId: string) {
  const charge = await (await charges()).findOneAndUpdate(
    { _id: chargeId, voided: { $ne: true } },
    { $set: { voided: true, consumed: true } },
    { returnDocument: "before" }
  )
  if (!charge) {
    return
  }
  await (await balances()).updateOne({ _id: charge.token }, { $inc: { cents: charge.amountCents } })
}

function formatLedgerMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}
