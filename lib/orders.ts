import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { pickupAddress } from "@/lib/pickup"

const ordersPath = path.join(process.cwd(), "data", "orders.json")

export type OrderItem = {
  id: string
  name: string
  detail: string
  price: number
  quantity: number
  pickup: string
}

export type Order = {
  id: string
  address: string
  pickups: string[]
  customer: string
  driver: string | null
  items: OrderItem[]
  total: number
  createdAt: string
}

async function readOrders() {
  try {
    const raw = await readFile(ordersPath, "utf8")
    const parsed = JSON.parse(raw) as { orders?: Order[] }
    return Array.isArray(parsed.orders) ? parsed.orders.map(withPickups) : []
  } catch {
    return []
  }
}

async function writeOrders(orders: Order[]) {
  await mkdir(path.dirname(ordersPath), { recursive: true })
  await writeFile(ordersPath, `${JSON.stringify({ orders }, null, 2)}\n`)
}

export async function addOrder(input: {
  address: string
  customer: string
  items: OrderItem[]
}) {
  const orders = await readOrders()
  const order: Order = {
    id: crypto.randomUUID(),
    address: input.address,
    pickups: uniquePickups(input.items),
    customer: input.customer,
    driver: null,
    items: input.items,
    total: input.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
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
    items: Array.isArray(order.items) ? order.items : [],
  }
}

export async function assignOrderToDriver(orderId: string, driver: string) {
  const orders = await readOrders()
  const next = orders.map((order) =>
    order.id === orderId && order.driver === null ? { ...order, driver } : order
  )
  await writeOrders(next)
}
