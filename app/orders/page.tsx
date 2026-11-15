import { Suspense } from "react"
import { CartProvider } from "@/components/cart-provider"
import { CreateOrderForm } from "@/components/create-order-form"
import { PageFrame } from "@/components/page-frame"
import { currentCartAccountId } from "@/lib/session"

export default function OrdersPage() {
  return (
    <PageFrame>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading your cart…</p>}>
        <OrderCart />
      </Suspense>
    </PageFrame>
  )
}

async function OrderCart() {
  const accountId = await currentCartAccountId()
  return (
    <CartProvider accountId={accountId}>
      <CreateOrderForm />
    </CartProvider>
  )
}
