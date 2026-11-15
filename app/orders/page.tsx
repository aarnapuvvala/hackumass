import { CartProvider } from "@/components/cart-provider"
import { CreateOrderForm } from "@/components/create-order-form"
import { PageFrame } from "@/components/page-frame"

export default function OrdersPage() {
  return (
    <PageFrame>
      <CartProvider>
        <CreateOrderForm />
      </CartProvider>
    </PageFrame>
  )
}
