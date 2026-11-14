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

  const sections = await saveMenuSections(parsed.sections)
  return Response.json({ sections })
}
