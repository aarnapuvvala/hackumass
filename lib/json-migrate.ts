import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Document } from "mongodb"
import { mongoCollection, type StringIdDocument } from "@/lib/mongo"

const dataDir = path.join(process.cwd(), "data")

let migration: Promise<void> | null = null

export function migrateJsonData() {
  migration ??= runMigration().catch((error: unknown) => {
    migration = null
    throw error
  })
  return migration
}

async function runMigration() {
  await seedAccounts()
  await seedDirectory()
  await seedCatalog()
  await seedMenu()
  await seedOrders()
  await seedEbt()
}

async function seedAccounts() {
  const collection = await mongoCollection<StringIdDocument>("accounts")
  if ((await collection.estimatedDocumentCount()) > 0) {
    return
  }
  const parsed = await readJson("accounts.json")
  const accounts = records(parsed, "accounts")
  for (const account of accounts) {
    if (!account || typeof account !== "object") {
      continue
    }
    const record = account as Record<string, unknown>
    await collection.updateOne(
      { _id: accountId(record) },
      { $setOnInsert: record as Document },
      { upsert: true }
    )
  }
}

async function seedDirectory() {
  const collection = await mongoCollection<StringIdDocument>("stores")
  if ((await collection.estimatedDocumentCount()) > 0) {
    return
  }
  const parsed = await readJson("stores.example.json")
  if (!Array.isArray(parsed)) {
    return
  }
  for (const store of parsed) {
    if (!store || typeof store !== "object") {
      continue
    }
    const record = store as Record<string, unknown>
    const name = typeof record.name === "string" ? record.name : ""
    const address = typeof record.address === "string" ? record.address : ""
    if (!name) {
      continue
    }
    await collection.updateOne(
      { _id: `${name}|${address}` },
      { $setOnInsert: record as Document },
      { upsert: true }
    )
  }
}

async function seedCatalog() {
  const collection = await mongoCollection<StringIdDocument>("catalogStores")
  if ((await collection.estimatedDocumentCount()) > 0) {
    return
  }
  const parsed = await readJson("supermarket.json")
  for (const store of records(parsed, "stores")) {
    if (!store || typeof store !== "object") {
      continue
    }
    const record = store as Record<string, unknown>
    const name = typeof record.name === "string" ? record.name : ""
    if (!name) {
      continue
    }
    await collection.updateOne({ _id: name }, { $setOnInsert: record as Document }, { upsert: true })
  }
}

async function seedMenu() {
  const collection = await mongoCollection<StringIdDocument>("menu")
  if ((await collection.estimatedDocumentCount()) > 0) {
    return
  }
  const parsed = await readJson("menu.json")
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return
  }
  const menu = parsed as Record<string, unknown>
  await collection.updateOne(
    { _id: "current" },
    {
      $setOnInsert: {
        photoUrl: menu.photoUrl ?? "",
        sections: Array.isArray(menu.sections) ? menu.sections : [],
        source: menu.source === "saved" ? "saved" : "",
      },
    },
    { upsert: true }
  )
}

async function seedOrders() {
  const collection = await mongoCollection<StringIdDocument>("orders")
  if ((await collection.estimatedDocumentCount()) > 0) {
    return
  }
  const parsed = await readJson("orders.json")
  for (const order of records(parsed, "orders")) {
    if (!order || typeof order !== "object") {
      continue
    }
    const record = order as Record<string, unknown>
    const id = typeof record.id === "string" ? record.id : ""
    if (!id) {
      continue
    }
    await collection.updateOne({ _id: id }, { $setOnInsert: record as Document }, { upsert: true })
  }
}

async function seedEbt() {
  const balances = await mongoCollection<StringIdDocument>("ebtBalances")
  const charges = await mongoCollection<StringIdDocument>("ebtCharges")
  const parsed = await readJson("ebt-ledger.json")
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return
  }
  const ledger = parsed as { balances?: unknown; charges?: unknown }

  if ((await balances.estimatedDocumentCount()) === 0 && ledger.balances && typeof ledger.balances === "object") {
    for (const [token, cents] of Object.entries(ledger.balances)) {
      if (!token || typeof cents !== "number") {
        continue
      }
      await balances.updateOne({ _id: token }, { $setOnInsert: { cents } }, { upsert: true })
    }
  }

  if ((await charges.estimatedDocumentCount()) === 0 && ledger.charges && typeof ledger.charges === "object") {
    for (const [key, charge] of Object.entries(ledger.charges)) {
      if (!charge || typeof charge !== "object") {
        continue
      }
      const record = charge as Record<string, unknown>
      const id = typeof record.id === "string" ? record.id : key
      await charges.updateOne({ _id: id }, { $setOnInsert: record as Document }, { upsert: true })
    }
  }
}

function accountId(account: Record<string, unknown>) {
  const role = typeof account.role === "string" ? account.role : "account"
  const key =
    (typeof account.username === "string" && account.username) ||
    (typeof account.name === "string" && account.name) ||
    "unknown"
  const createdAt = typeof account.createdAt === "string" ? account.createdAt : ""
  return `${role}:${key}:${createdAt}`
}

function records(parsed: unknown, key: string) {
  if (!parsed || typeof parsed !== "object" || !(key in parsed)) {
    return []
  }
  const value = (parsed as Record<string, unknown>)[key]
  return Array.isArray(value) ? value : []
}

async function readJson(filename: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path.join(dataDir, filename), "utf8")) as unknown
  } catch {
    return null
  }
}
