import { Suspense } from "react"
import { connection } from "next/server"
import { CreateMenu } from "@/components/create-menu"
import { loadMenu } from "@/lib/menu"

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
  const menu = await loadMenu()
  return <CreateMenu initialPhotoUrl={menu.photoUrl} initialSections={menu.sections} />
}
