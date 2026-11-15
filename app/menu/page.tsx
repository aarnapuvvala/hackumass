import { Suspense } from "react"
import Link from "next/link"
import { CartProvider } from "@/components/cart-provider"
import { ShoppingCartButton } from "@/components/shopping-cart"
import { StoreMenu, type MenuTableRow } from "@/components/store-menu"
import { buttonVariants } from "@/components/ui/button"
import { loadMenu, menuForStore, type SnapStatus } from "@/lib/menu"
import { cn } from "@/lib/utils"

const snapLabels: Record<SnapStatus, string> = {
  eligible: "SNAP eligible",
  "not-eligible": "Not eligible",
  unsure: "Unsure",
}

export default function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string | string[]; address?: string | string[] }>
}) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading menu…</p>}>
        <MenuHome searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function MenuHome({
  searchParams,
}: {
  searchParams: Promise<{ name?: string | string[]; address?: string | string[] }>
}) {
  const params = await searchParams
  const storeName = firstParam(params.name) || "Store"
  const storeAddress = firstParam(params.address)
  const menu = await loadMenu()
  const rows: MenuTableRow[] = menuForStore(menu.sections, storeName).flatMap((section) =>
    section.items.map((item) => ({
      id: item.id,
      category: section.name,
      name: item.name,
      price: parsePrice(item.price),
      snap: snapLabels[item.snap],
      snapEligible: item.snap === "eligible",
    }))
  )

  return (
    <CartProvider>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Link
              href="/customer_account"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
            >
              Back to stores
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">{storeName}</h1>
            {storeAddress ? <p className="text-sm text-muted-foreground">{storeAddress}</p> : null}
          </div>
          <ShoppingCartButton />
        </div>
        <StoreMenu storeName={storeName} storeAddress={storeAddress} rows={rows} />
      </div>
    </CartProvider>
  )
}

function firstParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim() ?? ""
}

function parsePrice(price: string) {
  const numeric = Number(price.replace(/[^0-9.]/g, ""))
  return Number.isFinite(numeric) ? numeric : 0
}
