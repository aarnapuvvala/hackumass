import { Suspense } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { assignOrder } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { listDriverOrders } from "@/lib/orders"
import { formatMoney } from "@/lib/utils"

export default function DriverAccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading deliveries…</p>}>
        <DriverAccount />
      </Suspense>
    </main>
  )
}

async function DriverAccount() {
  await connection()
  const cookieStore = await cookies()
  const auth = cookieStore.get("auth")?.value
  const role = cookieStore.get("role")?.value
  const username = cookieStore.get("username")?.value?.trim()

  if (auth !== "login" || role !== "driver" || !username) {
    redirect("/driver")
  }

  const orders = await listDriverOrders(username)

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-primary px-6 py-14 text-primary-foreground subtle-shadow">
        <p className="text-sm tracking-wide text-primary-foreground/70">Welcome</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">{username}</h1>
      </section>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Deliveries</h2>
        <p className="text-sm text-muted-foreground">
          Assign yourself to an open order.
        </p>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders have been placed yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id} className="surface subtle-shadow flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Starting point</p>
                  {order.pickups.length === 0 ? (
                    <p className="font-medium">Pickup address unavailable</p>
                  ) : (
                    order.pickups.map((pickup) => (
                      <p key={pickup} className="font-medium">
                        {pickup}
                      </p>
                    ))
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ending point</p>
                  <p className="font-medium">{order.address}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {order.items.map((item) => `${item.quantity} ${item.name}`).join(", ")} ·{" "}
                  {formatMoney(order.total)}
                </p>
              </div>
              {order.driver === username ? (
                <p className="text-sm font-medium">Assigned to you</p>
              ) : (
                <form action={assignOrder}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <Button type="submit" size="lg" className="h-10 w-full">
                    Assign
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
