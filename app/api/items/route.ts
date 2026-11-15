import { connection } from "next/server"
import { isStoredMenuPhoto } from "@/lib/menu-photos"
import { loadMenu, saveMenuPhoto } from "@/lib/menu"

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
  return Response.json({ photoUrl: saved })
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}
