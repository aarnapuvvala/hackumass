import { findCatalogStore, publicStore } from "@/lib/catalog"
import { migrateJsonData } from "@/lib/json-migrate"
import { mongoCollection, type StringIdDocument } from "@/lib/mongo"

export type CustomerAccount = {
  role: "customer"
  username: string
  password: string
  createdAt: string
}

export type DriverAccount = {
  role: "driver"
  username: string
  password: string
  licensePlate: string
  carModel: string
  carColor: string
  photoUrl: string
  createdAt: string
}

export type StoreAccount = {
  role: "store"
  name: string
  address: string
  password?: string
  snapEligible: boolean
  category?: string
  createdAt?: string
}

export type Account = CustomerAccount | DriverAccount | StoreAccount

async function readAccounts() {
  await migrateJsonData()
  const docs = await (await mongoCollection<StringIdDocument>("accounts")).find({}).toArray()
  return docs.flatMap((doc) => {
    const { _id, ...account } = doc
    return isAccount(account) ? [account] : []
  })
}

export async function listStoreAccounts() {
  const accounts = await readAccounts()
  return accounts.filter((account): account is StoreAccount => account.role === "store")
}

export async function findStoreAccount(name: string) {
  const catalogStore = await findCatalogStore(name)
  if (catalogStore) {
    return publicStore(catalogStore)
  }
  const accounts = await readAccounts()
  const storeName = name.trim()
  return (
    accounts.find(
      (account): account is StoreAccount =>
        account.role === "store" && account.name.trim() === storeName
    ) ?? null
  )
}

export async function authenticateStore(name: string, password: string) {
  const catalogStore = await findCatalogStore(name)
  if (catalogStore) {
    return catalogStore.password === password ? publicStore(catalogStore) : null
  }

  const account = await findStoreAccount(name)
  if (!account) {
    return null
  }
  const storedPassword =
    "password" in account && typeof account.password === "string" ? account.password : ""
  if (storedPassword && storedPassword !== password) {
    return null
  }
  return account
}

export async function findCustomerAccount(username: string) {
  const accounts = await readAccounts()
  return (
    accounts.find(
      (account): account is CustomerAccount =>
        account.role === "customer" && account.username === username
    ) ?? null
  )
}

export async function addAccount(account: Account) {
  await migrateJsonData()
  const key =
    account.role === "store"
      ? `store:${account.name}:${account.createdAt ?? ""}`
      : `${account.role}:${account.username}:${account.createdAt}`
  await (await mongoCollection<StringIdDocument>("accounts")).updateOne(
    { _id: key },
    { $setOnInsert: account },
    { upsert: true }
  )
}

function isAccount(value: unknown): value is Account {
  if (!value || typeof value !== "object") {
    return false
  }
  const account = value as { role?: unknown }
  return account.role === "customer" || account.role === "driver" || account.role === "store"
}
