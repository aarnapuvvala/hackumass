import { Suspense } from "react"
import { connection } from "next/server"
import { CartProvider } from "@/components/cart-provider"
import { PageFrame, PageIntro } from "@/components/page-frame"
import { ShoppingCartButton } from "@/components/shopping-cart"
import { loadPantryDetails } from "@/lib/pantry"
import { loadStores } from "@/lib/stores"
import { StoreDirectory } from "@/components/store-directory"
import { currentCartAccountId } from "@/lib/session"

export default function StoresPage() {
  return (
    <PageFrame width="md">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading stores…</p>}>
        <StoreAccounts />
      </Suspense>
    </PageFrame>
  )
}

async function StoreAccounts() {
  await connection()
  const accountId = await currentCartAccountId()
  const stores = await loadStores()
  const pantries = await loadPantryDetails(
    stores.filter((store) => store.category === "food_pantry").map((store) => store.name)
  )
  return (
    <CartProvider accountId={accountId}>
      <PageIntro
        kicker="Shop"
        title="Stores"
        description="Stores with an account appear closest to you first. SNAP marks stores that accept benefits. Food Bank marks free meals."
        actions={<ShoppingCartButton groupBySnap />}
      />
      <StoreDirectory stores={stores} pantries={pantries} />
    </CartProvider>
  )
}
