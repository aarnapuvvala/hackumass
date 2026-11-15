import { readFile } from "node:fs/promises"
import path from "node:path"
import type { StoreAccount } from "@/lib/accounts"
import { loadCatalogStores, publicStore } from "@/lib/catalog"

const examplePath = path.join(process.cwd(), "data", "stores.example.json")

export async function loadStores(): Promise<StoreAccount[]> {
  const listed = await readExampleStores()
  if (listed.length > 0) {
    return listed
  }
  const catalog = await loadCatalogStores()
  return catalog.map(publicStore)
}

async function readExampleStores(): Promise<StoreAccount[]> {
  try {
    const raw = await readFile(examplePath, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.flatMap((entry) => {
      const store = readStore(entry)
      return store ? [store] : []
    })
  } catch {
    return []
  }
}

function readStore(value: unknown): StoreAccount | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const store = value as Record<string, unknown>
  if (
    store.role !== "store" ||
    typeof store.name !== "string" ||
    typeof store.address !== "string" ||
    typeof store.snapEligible !== "boolean" ||
    (store.createdAt !== undefined && typeof store.createdAt !== "string")
  ) {
    return null
  }
  const category = typeof store.category === "string" ? store.category.trim() : ""
  return {
    role: "store",
    name: store.name,
    address: store.address,
    snapEligible: store.snapEligible,
    ...(typeof store.createdAt === "string" ? { createdAt: store.createdAt } : {}),
    ...(category ? { category } : {}),
  }
}
