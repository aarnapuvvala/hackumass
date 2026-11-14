import { CartProvider } from "@/components/cart-provider"
import { CreateOrderForm } from "@/components/create-order-form"

export default function OrdersPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <CartProvider>
        <CreateOrderForm />
      </CartProvider>
    </main>
  )
}
