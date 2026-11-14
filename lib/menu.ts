import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const menuPath = path.join(process.cwd(), "data", "menu.json")

export const snapStatuses = ["eligible", "not-eligible", "unsure"] as const

export type SnapStatus = (typeof snapStatuses)[number]

export type MenuManualItem = {
  id: string
  name: string
  price: string
  snap: SnapStatus
}

export type MenuSection = {
  id: string
  name: string
  items: MenuManualItem[]
}

export type MenuData = {
  photoUrl: string
  sections: MenuSection[]
}

const emptyMenu: MenuData = { photoUrl: "", sections: [] }

export async function loadMenu(): Promise<MenuData> {
  try {
    const raw = await readFile(menuPath, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") {
      return emptyMenu
    }
    const record = parsed as { photoUrl?: unknown; sections?: unknown }
    return {
      photoUrl: httpsUrl(record.photoUrl),
      sections: Array.isArray(record.sections)
        ? record.sections.flatMap((entry) => {
            const section = readSection(entry)
            return section ? [section] : []
          })
        : [],
    }
  } catch {
    return emptyMenu
  }
}

export async function saveMenuPhoto(photoUrl: string) {
  const menu = await loadMenu()
  menu.photoUrl = photoUrl
  await writeMenu(menu)
  return menu.photoUrl
}

export async function saveMenuSections(sections: MenuSection[]) {
  const menu = await loadMenu()
  menu.sections = sections
  await writeMenu(menu)
  return menu.sections
}

export function readSections(value: unknown) {
  if (!Array.isArray(value)) {
    return { error: "Menu sections are missing." } as const
  }

  const sections: MenuSection[] = []
  for (const entry of value) {
    const section = readSection(entry)
    if (!section) {
      return {
        error: "Each section needs a name, and each item needs a name and SNAP status.",
      } as const
    }
    sections.push(section)
  }
  return { sections } as const
}

async function writeMenu(menu: MenuData) {
  await mkdir(path.dirname(menuPath), { recursive: true })
  await writeFile(menuPath, `${JSON.stringify(menu, null, 2)}\n`)
}

function readSection(value: unknown): MenuSection | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const section = value as { id?: unknown; name?: unknown; items?: unknown }
  const name = typeof section.name === "string" ? section.name.trim() : ""
  if (!name || !Array.isArray(section.items)) {
    return null
  }
  const items: MenuManualItem[] = []
  for (const entry of section.items) {
    const item = readManualItem(entry)
    if (!item) {
      return null
    }
    items.push(item)
  }
  return {
    id: stringId(section.id),
    name,
    items,
  }
}

function readManualItem(value: unknown): MenuManualItem | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const item = value as { id?: unknown; name?: unknown; price?: unknown; snap?: unknown }
  const name = typeof item.name === "string" ? item.name.trim() : ""
  if (!name || !isSnapStatus(item.snap)) {
    return null
  }
  return {
    id: stringId(item.id),
    name,
    price: priceText(item.price),
    snap: item.snap,
  }
}

function priceText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return typeof value === "string" ? value.trim() : ""
}

function httpsUrl(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }
  try {
    return new URL(value).protocol === "https:" ? value : ""
  } catch {
    return ""
  }
}

function isSnapStatus(value: unknown): value is SnapStatus {
  return snapStatuses.some((status) => status === value)
}

function stringId(value: unknown) {
  return typeof value === "string" && value.trim() ? value : crypto.randomUUID()
}
