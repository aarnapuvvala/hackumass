import { access, constants, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { get, put } from "@vercel/blob"
import { pickupAddress } from "@/lib/pickup"

const ordersPath = path.join(process.cwd(), "data", "orders.json")
const runtimePath = path.join("/tmp", "hackumass-orders.json")
const blobPath = "orders.json"

let blobStore: boolean | null = null

export type OrderItem = {
  id: string
  name: string
  detail: string
  price: number
  quantity: number
  pickup: string
  snapEligible: boolean
}

export type CardPayment = {
  last4: string
  amount: number
  paymentIntentId: string
}

export type EbtPayment = {
  last4: string
  amount: number
  remainingBalance: number
  chargeId: string
}

export type OrderPayment = {
  checkoutId: string
  tip: number
  deliveryFee: number
  salesTax: number
  snapSubtotal: number
  otherSubtotal: number
  card: CardPayment | null
  ebt: EbtPayment | null
}

export type Order = {
  id: string
  address: string
  pickups: string[]
  customer: string
  driver: string | null
  items: OrderItem[]
  total: number
  payment: OrderPayment | null
  createdAt: string
}

function parseOrders(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { orders?: Order[] }
    return Array.isArray(parsed.orders) ? parsed.orders.map(withPickups) : []
  } catch {
    return []
  }
}

async function readFileOrders() {
  if (!(await canWrite(ordersPath))) {
    const runtime = await readFile(runtimePath, "utf8").catch(() => "")
    if (runtime) {
      return parseOrders(runtime)
    }
  }
  const seeded = await readFile(ordersPath, "utf8").catch(() => "")
  return seeded ? parseOrders(seeded) : []
}

async function readBlobOrders() {
  const result = await get(blobPath, { access: "private", useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) {
    return null
  }
  return parseOrders(await new Response(result.stream).text())
}

async function useBlobStore() {
  if (blobStore !== null) {
    return blobStore
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID && !process.env.VERCEL) {
    blobStore = false
    return false
  }
  try {
    await readBlobOrders()
    blobStore = true
  } catch {
    blobStore = false
  }
  return blobStore
}

async function readOrders() {
  if (await useBlobStore()) {
    const stored = await readBlobOrders()
    if (stored) {
      return stored
    }
  }
  return readFileOrders()
}

async function canWrite(filePath: string) {
  try {
    await access(path.dirname(filePath), constants.W_OK)
    return true
  } catch {
    return false
  }
}

async function writeOrders(orders: Order[]) {
  const payload = `${JSON.stringify({ orders }, null, 2)}\n`
  if (await useBlobStore()) {
    await put(blobPath, payload, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    })
    return
  }

  if (await canWrite(ordersPath)) {
    await mkdir(path.dirname(ordersPath), { recursive: true })
    await writeFile(ordersPath, payload)
    return
  }

  await writeFile(runtimePath, payload)
}

export async function addOrder(input: {
  address: string
  customer: string
  items: OrderItem[]
  payment: OrderPayment
}) {
  const orders = await readOrders()
  const order: Order = {
    id: crypto.randomUUID(),
    address: input.address,
    pickups: uniquePickups(input.items),
    customer: input.customer,
    driver: null,
    items: input.items,
    total: paidTotal(input.payment),
    payment: input.payment,
    createdAt: new Date().toISOString(),
  }
  orders.push(order)
  await writeOrders(orders)
  return order
}

export async function listDriverOrders(driver: string) {
  const orders = await readOrders()
  return orders.filter((order) => order.driver === null || order.driver === driver)
}

function paidTotal(payment: OrderPayment) {
  return (
    payment.snapSubtotal +
    payment.otherSubtotal +
    payment.salesTax +
    payment.deliveryFee +
    payment.tip
  )
}

function uniquePickups(items: OrderItem[]) {
  return [...new Set(items.map((item) => pickupAddress(item)).filter(Boolean))]
}

function withPickups(order: Order) {
  const stored = Array.isArray(order.pickups)
    ? order.pickups.filter((pickup) => typeof pickup === "string" && pickup.trim())
    : []
  return {
    ...order,
    pickups: stored.length > 0 ? stored : uniquePickups(order.items ?? []),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({ ...item, snapEligible: item.snapEligible === true }))
      : [],
    payment: normalizePayment(order.payment),
  }
}

function normalizePayment(payment: Order["payment"] | undefined) {
  if (!payment || typeof payment !== "object") {
    return null
  }
  return payment
}

export async function assignOrderToDriver(orderId: string, driver: string) {
  const orders = await readOrders()
  const next = orders.map((order) =>
    order.id === orderId && order.driver === null ? { ...order, driver } : order
  )
  await writeOrders(next)
}
