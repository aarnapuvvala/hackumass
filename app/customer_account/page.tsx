import { Suspense } from "react"
import { cookies } from "next/headers"
import { CartProvider } from "@/components/cart-provider"
import { ShoppingCartButton } from "@/components/shopping-cart"
import { StoreDirectory } from "@/components/store-directory"
import { findCustomerAccount } from "@/lib/accounts"
import { loadStores } from "@/lib/stores"

export default function CustomerAccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading your account…</p>}>
        <AccountHome />
      </Suspense>
    </main>
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
          <section className="rounded-2xl bg-primary px-6 py-14 text-primary-foreground subtle-shadow">
            <p className="text-sm tracking-wide text-primary-foreground/70">Welcome</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight">{name}</h1>
          </section>
        ) : (
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Stores</h1>
            <p className="text-muted-foreground">
              {auth === "guest"
                ? "You are browsing as a guest. Stores closest to you are listed first."
                : "Stores closest to you are listed first."}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Stores</h2>
            <p className="text-sm text-muted-foreground">
              A yellow circle means the store accepts SNAP. An orange circle means it is a food bank.
            </p>
          </div>
          <ShoppingCartButton groupBySnap />
        </div>
        <StoreDirectory stores={stores} />
      </div>
    </CartProvider>
  )
}
