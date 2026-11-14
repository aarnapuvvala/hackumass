import { Suspense } from "react"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { CreateMenu } from "@/components/create-menu"
import { findStoreAccount } from "@/lib/accounts"
import { loadMenu, menuForStore } from "@/lib/menu"

export default function AccountStorePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Store account</h1>
        <p className="text-muted-foreground">
          Create the menu shoppers will see for this store.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading menu…</p>}>
        <StoreMenu />
      </Suspense>
    </main>
  )
}

async function StoreMenu() {
  await connection()
  const cookieStore = await cookies()
  const username = cookieStore.get("username")?.value?.trim() ?? ""
  const store = username ? await findStoreAccount(username) : null
  const menu = await loadMenu()
  if (!store) {
    return (
      <p className="text-sm text-muted-foreground">
        Log in with your store name to edit this menu.
      </p>
    )
  }
  return (
    <CreateMenu
      storeName={store.name}
      initialPhotoUrl={menu.photoUrl}
      initialSections={menuForStore(menu.sections, store.name, { includeUnassigned: true })}
    />
  )
}
