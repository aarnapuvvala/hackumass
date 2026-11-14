import { cookies } from "next/headers"
import { findStoreAccount } from "@/lib/accounts"
import { readSections, saveMenuSections } from "@/lib/menu"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Send the menu as JSON." }, { status: 400 })
  }

  const record = body as { sections?: unknown }
  const parsed = readSections(record.sections)
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  const cookieStore = await cookies()
  const username = cookieStore.get("username")?.value?.trim() ?? ""
  const store = username ? await findStoreAccount(username) : null
  if (!store) {
    return Response.json(
      { error: "Log in with your store name before saving the menu." },
      { status: 401 }
    )
  }

  const sections = await saveMenuSections(parsed.sections, store.name)
  return Response.json({ sections })
}
