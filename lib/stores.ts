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
    return parsed.filter(isStore)
  } catch {
    return []
  }
}

function isStore(value: unknown): value is StoreAccount {
  if (!value || typeof value !== "object") {
    return false
  }
  const store = value as Record<string, unknown>
  return (
    store.role === "store" &&
    typeof store.name === "string" &&
    typeof store.address === "string" &&
    typeof store.snapEligible === "boolean" &&
    (store.createdAt === undefined || typeof store.createdAt === "string")
  )
}
