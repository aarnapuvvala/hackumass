import { createHmac, randomUUID } from "node:crypto"
import { access, constants, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { EBT_STARTING_BALANCE_CENTS } from "@/lib/checkout"

const ledgerPath = path.join(process.cwd(), "data", "ebt-ledger.json")
const runtimePath = path.join("/tmp", "hackumass-ebt-ledger.json")

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

type Ledger = {
  balances: Record<string, number>
  charges: Record<string, ChargeRecord>
}

function emptyLedger(): Ledger {
  return { balances: {}, charges: {} }
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

async function canWrite(filePath: string) {
  try {
    await access(path.dirname(filePath), constants.W_OK)
    return true
  } catch {
    return false
  }
}

async function readLedger() {
  const primary = (await canWrite(ledgerPath)) ? ledgerPath : runtimePath
  const raw = await readFile(primary, "utf8").catch(() => "")
  if (!raw) {
    const seeded = primary === ledgerPath ? "" : await readFile(ledgerPath, "utf8").catch(() => "")
    return seeded ? parseLedger(seeded) : emptyLedger()
  }
  return parseLedger(raw)
}

function parseLedger(raw: string): Ledger {
  try {
    const parsed = JSON.parse(raw) as Partial<Ledger>
    return {
      balances: parsed.balances && typeof parsed.balances === "object" ? parsed.balances : {},
      charges: parsed.charges && typeof parsed.charges === "object" ? parsed.charges : {},
    }
  } catch {
    return emptyLedger()
  }
}

async function writeLedger(ledger: Ledger) {
  const payload = `${JSON.stringify(ledger)}\n`
  if (await canWrite(ledgerPath)) {
    await mkdir(path.dirname(ledgerPath), { recursive: true })
    await writeFile(ledgerPath, payload)
    return
  }
  await writeFile(runtimePath, payload)
}

function balanceFor(ledger: Ledger, token: string) {
  const stored = ledger.balances[token]
  if (typeof stored === "number" && Number.isInteger(stored) && stored >= 0) {
    return stored
  }
  ledger.balances[token] = EBT_STARTING_BALANCE_CENTS
  return EBT_STARTING_BALANCE_CENTS
}

export async function checkEbtBalance(pan: string, pin: string) {
  if (!readPin(pin) || !readPan(pan)) {
    return { ok: false as const, error: "Enter an EBT card number and a 4-digit PIN." }
  }
  const ledger = await readLedger()
  const token = cardToken(pan)
  const balanceCents = balanceFor(ledger, token)
  await writeLedger(ledger)
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

  const ledger = await readLedger()
  const token = cardToken(input.pan)
  const balanceCents = balanceFor(ledger, token)
  if (input.amountCents > balanceCents) {
    return {
      ok: false as const,
      error: `The EBT balance is too low for that amount. Remaining balance ${formatLedgerMoney(balanceCents)}.`,
    }
  }

  const remainingBalanceCents = balanceCents - input.amountCents
  ledger.balances[token] = remainingBalanceCents
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
  ledger.charges[charge.id] = charge
  await writeLedger(ledger)
  return {
    ok: true as const,
    chargeId: charge.id,
    last4: charge.last4,
    amountCents: charge.amountCents,
    remainingBalanceCents,
  }
}

export async function getEbtCharge(chargeId: string) {
  const ledger = await readLedger()
  return ledger.charges[chargeId] ?? null
}

export async function consumeEbtCharge(chargeId: string) {
  const ledger = await readLedger()
  const charge = ledger.charges[chargeId]
  if (!charge || charge.voided) {
    return false
  }
  charge.consumed = true
  ledger.charges[chargeId] = charge
  await writeLedger(ledger)
  return true
}

export async function reverseEbtCharge(chargeId: string) {
  const ledger = await readLedger()
  const charge = ledger.charges[chargeId]
  if (!charge || charge.voided) {
    return
  }
  const current = balanceFor(ledger, charge.token)
  ledger.balances[charge.token] = current + charge.amountCents
  charge.voided = true
  charge.consumed = true
  ledger.charges[chargeId] = charge
  await writeLedger(ledger)
}

function formatLedgerMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}
