import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { findCatalogStore, publicStore } from "@/lib/catalog"

const accountsPath = path.join(process.cwd(), "data", "accounts.json")

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
  createdAt?: string
}

export type Account = CustomerAccount | DriverAccount | StoreAccount

async function readAccounts() {
  try {
    const raw = await readFile(accountsPath, "utf8")
    const parsed = JSON.parse(raw) as { accounts?: Account[] }
    return Array.isArray(parsed.accounts) ? parsed.accounts : []
  } catch {
    return []
  }
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
  await mkdir(path.dirname(accountsPath), { recursive: true })
  const accounts = await readAccounts()
  accounts.push(account)
  await writeFile(accountsPath, `${JSON.stringify({ accounts }, null, 2)}\n`)
}
