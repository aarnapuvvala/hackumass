"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

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

export async function continueAsGuest() {
  const cookieStore = await cookies()
  cookieStore.set("auth", "guest", cookieOptions)
  cookieStore.delete("username")
  cookieStore.delete("password")
}

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!username || !password) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set("username", username, cookieOptions)
  cookieStore.set("password", password, cookieOptions)
  cookieStore.set("auth", "login", cookieOptions)
}
