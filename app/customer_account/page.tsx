import { Suspense } from "react"
import { cookies } from "next/headers"
import { CartProvider } from "@/components/cart-provider"
import { PageFrame } from "@/components/page-frame"
import { ShoppingCartButton } from "@/components/shopping-cart"
import { StoreDirectory } from "@/components/store-directory"
import { findCustomerAccount } from "@/lib/accounts"
import { loadStores } from "@/lib/stores"

export default function CustomerAccountPage() {
  return (
    <PageFrame width="md">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading your account…</p>}>
        <AccountHome />
      </Suspense>
    </PageFrame>
  )
}

async function AccountHome() {
  const cookieStore = await cookies()
  const auth = cookieStore.get("auth")?.value
  const username = cookieStore.get("username")?.value?.trim()
  let name: string | null = null

  if (auth === "login" && username) {
    const account = await findCustomerAccount(username)
    name = account?.username ?? username
  }

  const stores = await loadStores()

  return (
    <CartProvider>
      <div className="flex flex-col gap-8">
        {name ? (
          <section className="surface subtle-shadow overflow-hidden">
            <div className="bg-primary px-6 py-10 text-primary-foreground">
              <p className="text-sm text-primary-foreground/80">Welcome</p>
              <h1 translate="no" className="mt-2 break-words text-4xl font-semibold tracking-tight">
                {name}
              </h1>
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-2">
            <h1 className="break-words text-3xl font-semibold tracking-tight">Stores</h1>
            <p className="text-pretty text-muted-foreground">
              {auth === "guest"
                ? "You are browsing as a guest. Stores closest to you are listed first."
                : "Stores closest to you are listed first."}
            </p>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg font-semibold">Stores</h2>
            <p className="text-pretty text-sm text-muted-foreground">
              SNAP marks stores that accept benefits. Food Bank marks free meals.
            </p>
          </div>
          <ShoppingCartButton groupBySnap />
        </div>
        <StoreDirectory stores={stores} />
      </div>
    </CartProvider>
  )
}
