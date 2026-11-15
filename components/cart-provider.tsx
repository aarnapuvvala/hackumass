"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { pickupAddress } from "@/lib/pickup"
import { formatMoney } from "@/lib/utils"

export type CartItem = {
  id: string
  name: string
  detail: string
  price: number
  quantity: number
  pickup: string
  snapEligible: boolean
}

type CartContextValue = {
  items: CartItem[]
  ready: boolean
  addItem: (item: Omit<CartItem, "quantity" | "pickup"> & { pickup?: string }) => void
  removeItem: (id: string) => void
  setQuantity: (id: string, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
export const cartStorageKey = "customer-cart"
const guestAccountId = "guest"

export function cartStorageKeyFor(accountId: string) {
  return `${cartStorageKey}:${encodeURIComponent(accountId)}`
}

let guestVisitItems: CartItem[] | null = null
let guestLeaveTimer: number | undefined

function isGuestAccount(accountId: string) {
  return accountId === guestAccountId
}

type StoredCart = {
  key: string
  items: CartItem[]
  ready: boolean
}

export function CartProvider({
  accountId,
  children,
}: {
  accountId: string
  children: React.ReactNode
}) {
  const storageKey = cartStorageKeyFor(accountId)
  const [cart, setCart] = useState<StoredCart>({ key: "", items: [], ready: false })
  const items = cart.key === storageKey ? cart.items : []
  const ready = cart.ready && cart.key === storageKey

  useEffect(() => {
    if (isGuestAccount(accountId)) {
      window.clearTimeout(guestLeaveTimer)
      window.localStorage.removeItem(storageKey)
      const items = guestVisitItems ?? []
      guestVisitItems = items
      setCart({ key: storageKey, items, ready: true })
      return () => {
        guestLeaveTimer = window.setTimeout(() => {
          guestVisitItems = null
        }, 0)
      }
    }
    setCart({ key: storageKey, items: readCart(storageKey), ready: true })
  }, [accountId, storageKey])

  useEffect(() => {
    if (!ready) {
      return
    }
    if (isGuestAccount(accountId)) {
      guestVisitItems = items
      window.localStorage.removeItem(storageKey)
      return
    }
    window.localStorage.setItem(storageKey, JSON.stringify(items))
  }, [accountId, items, ready, storageKey])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      addItem(item) {
        setCart((current) => {
          const currentItems = current.key === storageKey ? current.items : []
          const next = { ...item, pickup: pickupAddress(item) }
          const existing = currentItems.find((entry) => entry.id === next.id)
          const nextItems = !existing
            ? [...currentItems, { ...next, quantity: 1 }]
            : currentItems.map((entry) =>
                entry.id === next.id
                  ? { ...entry, ...next, quantity: entry.quantity + 1 }
                  : entry
              )
          return { key: storageKey, items: nextItems, ready: true }
        })
      },
      removeItem(id) {
        setCart((current) => ({
          key: storageKey,
          items: (current.key === storageKey ? current.items : []).filter((entry) => entry.id !== id),
          ready: true,
        }))
      },
      setQuantity(id, quantity) {
        setCart((current) => {
          const currentItems = current.key === storageKey ? current.items : []
          return {
            key: storageKey,
            items:
              quantity < 1
                ? currentItems.filter((entry) => entry.id !== id)
                : currentItems.map((entry) => (entry.id === id ? { ...entry, quantity } : entry)),
            ready: true,
          }
        })
      },
      clear() {
        if (isGuestAccount(accountId)) {
          guestVisitItems = []
          window.localStorage.removeItem(storageKey)
        } else {
          window.localStorage.setItem(storageKey, "[]")
        }
        setCart((current) =>
          current.key === storageKey && current.items.length === 0
            ? current
            : { key: storageKey, items: [], ready: true }
        )
      },
    }),
    [accountId, items, ready, storageKey]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) {
    throw new Error("useCart must be used within CartProvider")
  }
  return value
}

export function useOptionalCart() {
  return useContext(CartContext)
}

function readCart(storageKey: string) {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.flatMap((entry) => {
      const item = readStoredItem(entry)
      return item ? [item] : []
    })
  } catch {
    return []
  }
}

function readStoredItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const item = value as Record<string, unknown>
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof item.detail !== "string" ||
    typeof item.quantity !== "number" ||
    !Number.isFinite(item.quantity)
  ) {
    return null
  }
  const price = typeof item.price === "number" && Number.isFinite(item.price) ? item.price : 0
  const pickup = typeof item.pickup === "string" ? item.pickup : ""
  return {
    id: item.id,
    name: item.name,
    detail: item.detail,
    price,
    quantity: item.quantity,
    pickup: pickupAddress({ id: item.id, pickup }),
    snapEligible: item.snapEligible === true,
  }
}

export { formatMoney }
