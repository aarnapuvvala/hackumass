import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { loadCatalogStores } from "@/lib/catalog"
import { isStoredMenuPhoto } from "@/lib/menu-photos"

const menuPath = path.join(process.cwd(), "data", "menu.json")

export const snapStatuses = ["eligible", "not-eligible", "unsure"] as const

export type SnapStatus = (typeof snapStatuses)[number]

export type MenuManualItem = {
  id: string
  name: string
  price: string
  snap: SnapStatus
  store: string
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

export async function loadMenu(): Promise<MenuData> {
  const saved = await readSavedMenu()
  if (saved?.source === "saved") {
    return { photoUrl: saved.photoUrl, sections: saved.sections }
  }
  return {
    photoUrl: saved?.photoUrl ?? "",
    sections: await catalogSections(),
  }
}

export async function saveMenuPhoto(photoUrl: string) {
  const menu = await loadMenu()
  menu.photoUrl = photoUrl
  await writeMenu(menu)
  return menu.photoUrl
}

export function menuForStore(
  sections: MenuSection[],
  storeName: string,
  options?: { includeUnassigned?: boolean }
) {
  const name = storeName.trim()
  if (!name) {
    return []
  }
  return sections.flatMap((section) => {
    const items = section.items.filter(
      (item) => item.store === name || (options?.includeUnassigned && item.store === "")
    )
    return items.length > 0 ? [{ ...section, items }] : []
  })
}

export async function saveMenuSections(sections: MenuSection[], storeName: string) {
  const name = storeName.trim()
  const stamped = sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item, store: name })),
  }))
  const menu = await loadMenu()
  const savedIds = new Set(stamped.flatMap((section) => section.items.map((item) => item.id)))
  const kept = menu.sections.flatMap((section) => {
    const items = section.items.filter(
      (item) => item.store !== name && !savedIds.has(item.id)
    )
    return items.length > 0 ? [{ ...section, items }] : []
  })

  for (const section of stamped) {
    const existing = kept.find((entry) => entry.id === section.id)
    if (existing) {
      existing.name = section.name
      existing.items.push(...section.items)
    } else if (section.items.length > 0 || section.name) {
      kept.push(section)
    }
  }

  menu.sections = kept
  await writeMenu(menu)
  return stamped
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

async function catalogSections(): Promise<MenuSection[]> {
  const stores = await loadCatalogStores()
  const sections = new Map<string, MenuSection>()
  for (const store of stores) {
    for (const category of store.categories) {
      const id = slug(category.name)
      const section = sections.get(id) ?? { id, name: category.name, items: [] }
      for (const item of category.items) {
        section.items.push({
          id: `${slug(store.name)}-${slug(item.name)}`,
          name: item.name,
          price: item.price,
          snap: item.snapEligible ? "eligible" : "not-eligible",
          store: store.name,
        })
      }
      sections.set(id, section)
    }
  }
  return [...sections.values()]
}

async function readSavedMenu() {
  try {
    const raw = await readFile(menuPath, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") {
      return null
    }
    const record = parsed as { photoUrl?: unknown; sections?: unknown; source?: unknown }
    return {
      photoUrl: httpsUrl(record.photoUrl),
      source: record.source === "saved" ? "saved" : "",
      sections: Array.isArray(record.sections)
        ? record.sections.flatMap((entry) => {
            const section = readSection(entry)
            return section ? [section] : []
          })
        : [],
    }
  } catch {
    return null
  }
}

async function writeMenu(menu: MenuData) {
  await mkdir(path.dirname(menuPath), { recursive: true })
  await writeFile(
    menuPath,
    `${JSON.stringify({ ...menu, source: "saved" }, null, 2)}\n`
  )
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
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
  const item = value as {
    id?: unknown
    name?: unknown
    price?: unknown
    snap?: unknown
    store?: unknown
  }
  const name = typeof item.name === "string" ? item.name.trim() : ""
  if (!name || !isSnapStatus(item.snap)) {
    return null
  }
  return {
    id: stringId(item.id),
    name,
    price: priceText(item.price),
    snap: item.snap,
    store: typeof item.store === "string" ? item.store.trim() : "",
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
  if (isStoredMenuPhoto(value)) {
    return value
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
