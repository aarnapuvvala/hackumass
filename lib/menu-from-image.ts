import { readMenuPhoto, isStoredMenuPhoto } from "@/lib/menu-photos"
import type { MenuSection, SnapStatus } from "@/lib/menu"

const model = "grok-4.7"

const visionTypes: Record<string, "image/jpeg" | "image/png"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/png": "image/png",
}

const instructions = [
  "Read the photographed menu and return JSON only.",
  'Schema: {"sections":[{"name":string,"items":[{"name":string,"price":string,"snap":string,"soldHot":boolean}]}]}',
  "Preserve the menu's categories, in the same order, as section names.",
  "Preserve each food name as printed.",
  "Preserve each price as printed, without a leading $.",
  "Do not invent items, categories, or prices that are not on the menu.",
  'Set snap to "eligible" or "not-eligible" for every item.',
  "If the menu itself marks SNAP, EBT, or eligibility, keep that mark.",
  "Otherwise decide with USDA SNAP rules. Household food is eligible: fruits and vegetables, meat, poultry, fish, dairy, breads and cereals, snack foods, non-alcoholic beverages, and seeds or plants that produce food for the household.",
  "These are not eligible: beer, wine, and liquor; cigarettes and tobacco; cannabis, marijuana, and CBD; vitamins, medicines, and supplements; live animals except shellfish, fish removed from water, and animals slaughtered before pickup; food that is hot at the point of sale; pet food; cleaning supplies, paper products, and household supplies; hygiene items and cosmetics.",
  'Mark snap "eligible" only when you are at least 80% sure the item is eligible. If you are less sure, mark snap "not-eligible".',
  "soldHot is true only when the menu shows the item is hot at the point of sale, such as a hot bar, rotisserie, or a drink served hot. Packaged foods, hot sauce, and hot dogs are not sold hot. A soldHot item is not eligible.",
  "Skip decorative text, addresses, hours, and section headings with no items.",
].join("\n")

export async function menuFromPhoto(photoUrl: string): Promise<MenuSection[]> {
  const photo = await loadPhoto(photoUrl)
  if (!photo) {
    throw new Error("Could not open the menu photo.")
  }
  const contentType = visionTypes[photo.contentType]
  if (!contentType) {
    throw new Error("Use a JPG or PNG photo so the menu can be read.")
  }

  const raw = await readWithGrok(photo.bytes, contentType)
  try {
    return sectionsFromModel(raw)
  } catch {
    throw new Error("Could not read the menu from that photo.")
  }
}

async function loadPhoto(photoUrl: string) {
  if (isStoredMenuPhoto(photoUrl)) {
    const filename = photoUrl.slice("/api/menu-photos/".length)
    return readMenuPhoto(filename)
  }
  if (!photoUrl.startsWith("https://")) {
    return null
  }
  const response = await fetch(photoUrl, { signal: AbortSignal.timeout(20000) })
  if (!response.ok) {
    return null
  }
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || ""
  return { bytes: Buffer.from(await response.arrayBuffer()), contentType }
}

async function readWithGrok(bytes: Buffer, contentType: string) {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    throw new Error("Add XAI_API_KEY before reading a menu photo.")
  }

  const response = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: "low" },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:${contentType};base64,${bytes.toString("base64")}`,
              detail: "high",
            },
            { type: "input_text", text: instructions },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error("Grok menu request failed", response.status, detail.slice(0, 300))
    if (detail.includes("Incorrect API key")) {
      throw new Error("The xAI API key was rejected. Create one at console.x.ai and replace XAI_API_KEY.")
    }
    throw new Error("Could not read the menu from that photo.")
  }

  const payload = (await response.json()) as {
    output_text?: unknown
    output?: { content?: { text?: unknown }[] }[]
  }
  const text = responseText(payload)
  if (!text) {
    throw new Error("Could not read the menu from that photo.")
  }
  return text
}

function responseText(payload: { output_text?: unknown; output?: { content?: { text?: unknown }[] }[] }) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text
  }
  const parts: string[] = []
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        parts.push(content.text)
      }
    }
  }
  return parts.join("\n")
}

export function sectionsFromModel(raw: string): MenuSection[] {
  const parsed = parseMenuJson(raw)
  if (!Array.isArray(parsed.sections)) {
    return []
  }

  const sections: MenuSection[] = []
  for (const entry of parsed.sections) {
    if (!entry || typeof entry !== "object") {
      continue
    }
    const record = entry as { name?: unknown; items?: unknown }
    const name = typeof record.name === "string" ? record.name.trim() : ""
    if (!name || !Array.isArray(record.items)) {
      continue
    }

    const items = record.items.flatMap((item) => {
      const menuItem = readItem(item)
      return menuItem ? [menuItem] : []
    })
    if (items.length === 0) {
      continue
    }

    const id = slug(name)
    const existing = sections.find((section) => section.id === id)
    if (existing) {
      existing.items.push(...items)
    } else {
      sections.push({ id, name, items })
    }
  }
  return sections
}

function readItem(value: unknown) {
  if (!value || typeof value !== "object") {
    return null
  }
  const item = value as { name?: unknown; price?: unknown; snap?: unknown; soldHot?: unknown }
  const name = typeof item.name === "string" ? item.name.trim() : ""
  if (!name) {
    return null
  }
  const mark = snapMark(item.snap)
  const soldHot = item.soldHot === true
  const snap: SnapStatus = soldHot ? "not-eligible" : mark || "not-eligible"
  return {
    id: crypto.randomUUID(),
    name,
    price: priceText(item.price),
    snap,
    store: "",
  }
}

function snapMark(value: unknown): SnapStatus | "" {
  if (typeof value !== "string") {
    return ""
  }
  const text = value.trim().toLowerCase()
  if (text === "eligible" || text === "snap eligible" || text === "ebt") {
    return "eligible"
  }
  if (
    text === "not-eligible" ||
    text === "not eligible" ||
    text === "ineligible" ||
    text === "not snap eligible"
  ) {
    return "not-eligible"
  }
  return ""
}

function priceText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value !== "string") {
    return ""
  }
  return value.trim().replace(/^\$/, "")
}

function parseMenuJson(raw: string): { sections?: unknown } {
  const fenced = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1] ?? "")
  const marked = raw.lastIndexOf('{"sections"')
  const candidates = marked >= 0 ? [raw.slice(marked), ...fenced, raw] : [...fenced, raw]
  for (const candidate of candidates) {
    const start = candidate.indexOf("{")
    const end = candidate.lastIndexOf("}")
    if (start < 0 || end <= start) {
      continue
    }
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as { sections?: unknown }
    } catch {
      continue
    }
  }
  throw new Error("Could not read the menu from that photo.")
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || crypto.randomUUID()
  )
}
