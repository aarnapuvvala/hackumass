import { Suspense } from "react"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { CreateMenu } from "@/components/create-menu"
import { findStoreAccount } from "@/lib/accounts"
import { loadMenu, menuForStore } from "@/lib/menu"
import { PageFrame, PageIntro } from "@/components/page-frame"

export default function AccountStorePage() {
  return (
    <PageFrame width="md">
      <PageIntro
        kicker="Store"
        title="Store Account"
        description="Build the menu shoppers see for this store."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading menu…</p>}>
        <StoreMenu />
      </Suspense>
    </PageFrame>
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
