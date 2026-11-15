import { Suspense } from "react"
import { connection } from "next/server"
import { CartProvider } from "@/components/cart-provider"
import { ShoppingCartButton } from "@/components/shopping-cart"
import { loadStores } from "@/lib/stores"
import { StoreDirectory } from "@/components/store-directory"

export default function StoresPage() {
  return (
    <CartProvider>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Stores</h1>
          <p className="text-muted-foreground">
            Stores with an account, closest to you first. A yellow circle means the
            store accepts SNAP. An orange circle means it is a food bank.
          </p>
        </div>
        <ShoppingCartButton groupBySnap />
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading stores…</p>}>
        <StoreAccounts />
      </Suspense>
      </main>
    </CartProvider>
  )
}

async function StoreAccounts() {
  await connection()
  const stores = await loadStores()
  return <StoreDirectory stores={stores} />
}
