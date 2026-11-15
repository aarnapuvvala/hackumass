"use client"

import { formatMoney, useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"

export type MenuTableRow = {
  id: string
  category: string
  name: string
  price: number
  snap: string
  snapEligible: boolean
}

export function StoreMenu({
  storeName,
  storeAddress,
  rows,
}: {
  storeName: string
  storeAddress: string
  rows: MenuTableRow[]
}) {
  const cart = useCart()

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">This store has no menu items yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium">Price</th>
            <th className="px-3 py-2 font-medium">SNAP eligibility</th>
            <th className="px-3 py-2 font-medium">
              <span className="sr-only">Add to cart</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-b-0">
              <td className="px-3 py-2">{row.category}</td>
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2">{formatMoney(row.price)}</td>
              <td className="px-3 py-2">{row.snap}</td>
              <td className="px-3 py-2 text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    cart.addItem({
                      id: `${storeName}|${storeAddress}|${row.id}`,
                      name: row.name,
                      detail: `${storeName} · ${row.category}`,
                      price: row.price,
                      pickup: storeAddress,
                      snapEligible: row.snapEligible,
                    })
                  }
                >
                  Add to cart
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
