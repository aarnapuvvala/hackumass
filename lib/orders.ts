import { pickupAddress } from "@/lib/pickup"
import { migrateJsonData } from "@/lib/json-migrate"
import { mongoCollection, type StringIdDocument } from "@/lib/mongo"

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

async function ordersCollection() {
  await migrateJsonData()
  return mongoCollection<StringIdDocument>("orders")
}

async function readOrders() {
  const docs = await (await ordersCollection()).find({}).sort({ createdAt: 1 }).toArray()
  return docs.flatMap((doc) => {
    if (!doc || typeof doc !== "object") {
      return []
    }
    const { _id, ...order } = doc
    return [withPickups(order as Order)]
  })
}

export async function addOrder(input: {
  address: string
  customer: string
  items: OrderItem[]
  payment: OrderPayment
}) {
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
  await (await ordersCollection()).insertOne({ ...order, _id: order.id })
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
  await (await ordersCollection()).updateOne(
    { id: orderId, driver: null },
    { $set: { driver } }
  )
}
