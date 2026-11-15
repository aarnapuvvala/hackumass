import { cookies } from "next/headers"
import { connection } from "next/server"
import { findStoreAccount } from "@/lib/accounts"
import { menuFromPhoto } from "@/lib/menu-from-image"
import { isStoredMenuPhoto } from "@/lib/menu-photos"
import { loadMenu, saveMenuPhoto, saveMenuSections } from "@/lib/menu"

export const maxDuration = 120

export async function GET() {
  await connection()
  const menu = await loadMenu()
  return Response.json({ photoUrl: menu.photoUrl })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Send the menu photo as JSON." }, { status: 400 })
  }

  const photoUrl =
    typeof (body as { photoUrl?: unknown }).photoUrl === "string"
      ? (body as { photoUrl: string }).photoUrl.trim()
      : ""

  if (!isStoredMenuPhoto(photoUrl) && !isHttpsUrl(photoUrl)) {
    return Response.json({ error: "Upload a menu photo before saving." }, { status: 400 })
  }

  const saved = await saveMenuPhoto(photoUrl)

  const cookieStore = await cookies()
  const username = cookieStore.get("username")?.value?.trim() ?? ""
  const store = username ? await findStoreAccount(username) : null
  if (!store) {
    return Response.json({
      photoUrl: saved,
      error: "Log in with your store name before creating a menu from the photo.",
    })
  }

  try {
    const sections = await menuFromPhoto(saved)
    if (sections.length === 0) {
      return Response.json({
        photoUrl: saved,
        error: "No menu items could be read from that photo.",
      })
    }
    const savedSections = await saveMenuSections(sections, store.name)
    return Response.json({ photoUrl: saved, sections: savedSections })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the menu from that photo."
    return Response.json({ photoUrl: saved, error: message })
  }
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}
