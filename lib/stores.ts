import { access, readFile } from "node:fs/promises"
import path from "node:path"
import type { StoreAccount } from "@/lib/accounts"

const storesPath = path.join(process.cwd(), "data", "stores.json")
const examplePath = path.join(process.cwd(), "data", "stores.example.json")

export async function loadStores(): Promise<StoreAccount[]> {
  const file = (await exists(storesPath)) ? storesPath : examplePath
  try {
    const raw = await readFile(file, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isStore)
  } catch {
    return []
  }
}

async function exists(file: string) {
  try {
    await access(file)
    return true
  } catch {
    return false
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
