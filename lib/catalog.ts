import type { StoreAccount } from "@/lib/accounts"
import { migrateJsonData } from "@/lib/json-migrate"
import { mongoCollection, type StringIdDocument } from "@/lib/mongo"

export type CatalogItem = {
  name: string
  price: string
  snapEligible: boolean
}

export type CatalogCategory = {
  name: string
  items: CatalogItem[]
}

export type CatalogStore = StoreAccount & {
  username: string
  password: string
  categories: CatalogCategory[]
}

export async function loadCatalogStores(): Promise<CatalogStore[]> {
  await migrateJsonData()
  const docs = await (await mongoCollection<StringIdDocument>("catalogStores")).find({}).toArray()
  return docs.flatMap((entry) => {
    const store = readCatalogStore(entry)
    return store ? [store] : []
  })
}

export async function findCatalogStore(name: string) {
  const storeName = name.trim()
  if (!storeName) {
    return null
  }
  const stores = await loadCatalogStores()
  return (
    stores.find((store) => store.name === storeName || store.username === storeName) ?? null
  )
}

export function publicStore(store: CatalogStore): StoreAccount {
  return {
    role: "store",
    name: store.name,
    address: store.address,
    snapEligible: store.snapEligible,
    ...(store.category ? { category: store.category } : {}),
  }
}

function readCatalogStore(value: unknown): CatalogStore | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const store = value as Record<string, unknown>
  const name = text(store.name)
  const username = text(store.username) || name
  const password = text(store.password)
  const address = text(store.address)
  const category = text(store.category)
  if (store.role !== "store" || !name || !password || !address || typeof store.snapEligible !== "boolean") {
    return null
  }
  if (!Array.isArray(store.categories)) {
    return null
  }
  const categories: CatalogCategory[] = []
  for (const entry of store.categories) {
    const category = readCategory(entry)
    if (!category) {
      return null
    }
    categories.push(category)
  }
  return {
    role: "store",
    name,
    username,
    password,
    address,
    snapEligible: store.snapEligible,
    ...(category ? { category } : {}),
    categories,
  }
}

function readCategory(value: unknown): CatalogCategory | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const category = value as { name?: unknown; items?: unknown }
  const name = text(category.name)
  if (!name || !Array.isArray(category.items)) {
    return null
  }
  const items: CatalogItem[] = []
  for (const entry of category.items) {
    if (!entry || typeof entry !== "object") {
      return null
    }
    const item = entry as { name?: unknown; price?: unknown; snapEligible?: unknown }
    const itemName = text(item.name)
    const price = text(item.price)
    if (!itemName || !price || typeof item.snapEligible !== "boolean") {
      return null
    }
    items.push({ name: itemName, price, snapEligible: item.snapEligible })
  }
  return { name, items }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
