import { Suspense } from "react"
import { cookies } from "next/headers"
import { LocationMap } from "@/components/location-map"
import { ShoppingBagButton } from "@/components/shopping-bag-button"

export default function ShoppingPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Shopping</h1>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading account…</p>}>
            <CustomerStatus />
          </Suspense>
        </div>
        <ShoppingBagButton />
      </div>
      <LocationMap />
    </main>
  )
}

async function CustomerStatus() {
  const cookieStore = await cookies()
  const status = cookieStore.get("customerStatus")?.value
  const username = cookieStore.get("username")?.value

  if (status === "signed-in" && username) {
    return (
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{username}</span>
      </p>
    )
  }

  if (status === "guest") {
    return <p className="text-sm text-muted-foreground">Continuing as a guest</p>
  }

  return (
    <p className="text-sm text-muted-foreground">
      Customer status is not saved yet. Log in or continue as a guest first.
    </p>
  )
}
