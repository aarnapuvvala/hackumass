import { readStoredJson, writeStoredJson } from "@/lib/json-store"

const accountsFile = "accounts.json"

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
  snapEligible: boolean
  createdAt?: string
}

export type Account = CustomerAccount | DriverAccount | StoreAccount

async function readAccounts() {
  const raw = await readStoredJson(accountsFile)
  if (!raw) {
    return []
  }
  try {
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
  const accounts = await readAccounts()
  const storeName = name.trim()
  return (
    accounts.find(
      (account): account is StoreAccount =>
        account.role === "store" && account.name.trim() === storeName
    ) ?? null
  )
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
  const accounts = await readAccounts()
  accounts.push(account)
  await writeStoredJson(accountsFile, `${JSON.stringify({ accounts }, null, 2)}\n`)
}
