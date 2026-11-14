"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { addAccount, findCustomerAccount, type Account } from "@/lib/accounts"
import { geocodeAddress, milesBetween } from "@/lib/geo"

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
  const account = await findCustomerAccount(username)
  const signedInName =
    account && account.password === password ? account.username : username
  cookieStore.set("username", signedInName, cookieOptions)
  cookieStore.set("password", password, cookieOptions)
  cookieStore.set("auth", "login", cookieOptions)
  const redirectTo = String(formData.get("redirectTo") ?? "")
  if (redirectTo === "/customer_account") {
    cookieStore.set("role", "customer", cookieOptions)
    redirect("/customer_account")
  }
  if (redirectTo === "/account-store" || cookieStore.get("role")?.value === "store") {
    if (redirectTo === "/account-store") {
      cookieStore.set("role", "store", cookieOptions)
    }
    redirect("/account-store")
  }
  if (cookieStore.get("role")?.value === "customer") {
    redirect("/customer_account")
  }
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
    if (!isHttpsUrl(photoUrl)) {
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

  try {
    await addAccount(account)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the account."
    return { ok: false, error: message }
  }
  if (account.role === "customer") {
    cookieStore.set("role", "customer", cookieOptions)
    cookieStore.set("username", account.username, cookieOptions)
    cookieStore.set("password", account.password, cookieOptions)
    cookieStore.set("auth", "login", cookieOptions)
    redirect("/customer_account")
  }
  if (account.role === "store") {
    cookieStore.set("username", account.name, cookieOptions)
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

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}
