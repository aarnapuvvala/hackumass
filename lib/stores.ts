import type { StoreAccount } from "@/lib/accounts"
import { loadCatalogStores, publicStore } from "@/lib/catalog"
import { migrateJsonData } from "@/lib/json-migrate"
import { mongoCollection, type StringIdDocument } from "@/lib/mongo"

export async function loadStores(): Promise<StoreAccount[]> {
  const listed = await readDirectoryStores()
  if (listed.length > 0) {
    return listed
  }
  const catalog = await loadCatalogStores()
  return catalog.map(publicStore)
}

async function readDirectoryStores(): Promise<StoreAccount[]> {
  await migrateJsonData()
  const docs = await (await mongoCollection<StringIdDocument>("stores")).find({}).toArray()
  return docs.flatMap((entry) => {
    const store = readStore(entry)
    return store ? [store] : []
  })
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
