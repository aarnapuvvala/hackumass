import { cookies } from "next/headers"

export async function currentCartAccountId() {
  const cookieStore = await cookies()
  if (cookieStore.get("auth")?.value !== "login") {
    return "guest"
  }
  const username = cookieStore.get("username")?.value?.trim()
  return username || "guest"
}
