"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { addAccount, authenticateStore, findCustomerAccount, type Account } from "@/lib/accounts"
import { geocodeAddress, milesBetween } from "@/lib/geo"
import { isStoredLicense } from "@/lib/licenses"
import { pickupAddress } from "@/lib/pickup"
import { addOrder, assignOrderToDriver, type OrderItem } from "@/lib/orders"

const ROLES = ["customer", "driver", "store"] as const

type Role = (typeof ROLES)[number]

function isRole(value: string): value is Role {
  return ROLES.some((role) => role === value)
}

const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
}

export async function selectRole(formData: FormData) {
  const role = String(formData.get("role") ?? "")
  if (!isRole(role)) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set("role", role, cookieOptions)
  cookieStore.delete("auth")
  cookieStore.delete("username")
  cookieStore.delete("password")
  redirect(`/${role}`)
}

export async function startCustomerSignup() {
  const cookieStore = await cookies()
  cookieStore.set("role", "customer", cookieOptions)
  redirect("/account")
}

export async function continueAsGuest() {
  const cookieStore = await cookies()
  cookieStore.set("auth", "guest", cookieOptions)
  cookieStore.delete("username")
  cookieStore.delete("password")
  redirect("/customer_account")
}

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!username || !password) {
    return
  }

  const cookieStore = await cookies()
  const redirectTo = String(formData.get("redirectTo") ?? "")
  const role = cookieStore.get("role")?.value

  if (redirectTo === "/account-store" || (redirectTo === "" && role === "store")) {
    const store = await authenticateStore(username, password)
    if (!store) {
      return
    }
    cookieStore.set("role", "store", cookieOptions)
    cookieStore.set("username", store.name, cookieOptions)
    cookieStore.set("password", password, cookieOptions)
    cookieStore.set("auth", "login", cookieOptions)
    redirect("/account-store")
  }

  const account = await findCustomerAccount(username)
  const signedInName =
    account && account.password === password ? account.username : username
  cookieStore.set("username", signedInName, cookieOptions)
  cookieStore.set("password", password, cookieOptions)
  cookieStore.set("auth", "login", cookieOptions)
  if (redirectTo === "/driver_account") {
    cookieStore.set("role", "driver", cookieOptions)
    redirect("/driver_account")
  }
  if (redirectTo === "/customer_account") {
    cookieStore.set("role", "customer", cookieOptions)
    redirect("/customer_account")
  }
  if (role === "driver") {
    cookieStore.set("role", "driver", cookieOptions)
    redirect("/driver_account")
  }
  cookieStore.set("role", "customer", cookieOptions)
  redirect("/customer_account")
}

export type CreateOrderState = {
  ok: boolean
  error?: string
  address?: string
} | null

export async function createOrder(
  _previous: CreateOrderState,
  formData: FormData
): Promise<CreateOrderState> {
  const address = text(formData, "address")
  const items = parseOrderItems(formData.get("items"))
  if (!address) {
    return { ok: false, error: "Enter a delivery address." }
  }
  if (items.length === 0) {
    return { ok: false, error: "Your cart is empty." }
  }

  const cookieStore = await cookies()
  const username = cookieStore.get("username")?.value?.trim()
  const customer =
    cookieStore.get("auth")?.value === "login" && username ? username : "guest"
  await addOrder({ address, customer, items })
  return { ok: true, address }
}

export async function assignOrder(formData: FormData) {
  const orderId = text(formData, "orderId")
  const cookieStore = await cookies()
  const username = cookieStore.get("username")?.value?.trim()
  if (
    !orderId ||
    cookieStore.get("auth")?.value !== "login" ||
    cookieStore.get("role")?.value !== "driver" ||
    !username
  ) {
    redirect("/driver")
  }

  await assignOrderToDriver(orderId, username)
  redirect("/driver_account")
}

export type CreateAccountState = {
  ok: boolean
  error?: string
} | null

export async function createAccount(
  _previous: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const cookieStore = await cookies()
  const submittedRole = String(formData.get("accountRole") ?? "")
  const role = isRole(submittedRole) ? submittedRole : cookieStore.get("role")?.value
  const createdAt = new Date().toISOString()

  let account: Account
  if (role === "customer") {
    const username = text(formData, "username")
    const password = String(formData.get("password") ?? "")
    if (!username || !password) {
      return { ok: false, error: "Username and password are required." }
    }
    account = { role, username, password, createdAt }
    await addAccount(account)
    cookieStore.set("role", "customer", cookieOptions)
    cookieStore.set("username", username, cookieOptions)
    cookieStore.set("password", password, cookieOptions)
    cookieStore.set("auth", "login", cookieOptions)
    redirect("/customer_account")
  } else if (role === "driver") {
    const username = text(formData, "username")
    const password = String(formData.get("password") ?? "")
    const licensePlate = text(formData, "licensePlate")
    const carModel = text(formData, "carModel")
    const carColor = text(formData, "carColor")
    const photoUrl = text(formData, "photoUrl")
    if (!username || !password || !licensePlate || !carModel || !carColor) {
      return { ok: false, error: "Fill in every driver field." }
    }
    if (!isHttpsUrl(photoUrl) && !isStoredLicense(photoUrl)) {
      return { ok: false, error: "Upload a driver's license photo first." }
    }
    account = {
      role,
      username,
      password,
      licensePlate,
      carModel,
      carColor,
      photoUrl,
      createdAt,
    }
  } else if (role === "store") {
    const name = text(formData, "name")
    const address = text(formData, "address")
    if (!name || !address) {
      return { ok: false, error: "Name and address are required." }
    }
    account = {
      role,
      name,
      address,
      snapEligible: formData.get("snapEligible") === "on",
      createdAt,
    }
  } else {
    return { ok: false, error: "Choose a role before creating an account." }
  }

  await addAccount(account)
  if (role === "store") {
    cookieStore.set("auth", "login", cookieOptions)
    redirect("/account-store")
  }
  return { ok: true }
}

export async function storeDistances(
  lat: number,
  lon: number,
  addresses: string[]
) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {}
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return {}
  }

  const distances: Record<string, number | null> = {}
  const unique = [...new Set(addresses.map((address) => address.trim()))].slice(0, 25)
  for (const [index, address] of unique.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1100))
    }
    const point = await geocodeAddress(address)
    distances[address] =
      point == null
        ? null
        : Math.round(milesBetween(lat, lon, point.lat, point.lon) * 10) / 10
  }
  return distances
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function parseOrderItems(value: FormDataEntryValue | null): OrderItem[] {
  if (typeof value !== "string" || !value) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return []
      }
      const item = entry as Record<string, unknown>
      const quantity = item.quantity
      const price = item.price
      if (
        typeof item.id !== "string" ||
        typeof item.name !== "string" ||
        typeof item.detail !== "string" ||
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99 ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        return []
      }
      const pickup = typeof item.pickup === "string" ? item.pickup : ""
      return [
        {
          id: item.id,
          name: item.name,
          detail: item.detail,
          price,
          quantity,
          pickup: pickupAddress({ id: item.id, pickup }),
        },
      ]
    }).slice(0, 100)
  } catch {
    return []
  }
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}
