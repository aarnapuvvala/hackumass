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
const storageKey = "customer-cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setItems(parsed.flatMap((entry) => {
            const item = readStoredItem(entry)
            return item ? [item] : []
          }))
        }
      }
    } catch {
      setItems([])
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) {
      return
    }
    window.localStorage.setItem(storageKey, JSON.stringify(items))
  }, [items, ready])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      addItem(item) {
        setItems((current) => {
          const next = { ...item, pickup: pickupAddress(item) }
          const existing = current.find((entry) => entry.id === next.id)
          if (!existing) {
            return [...current, { ...next, quantity: 1 }]
          }
          return current.map((entry) =>
            entry.id === next.id ? { ...entry, quantity: entry.quantity + 1 } : entry
          )
        })
      },
      removeItem(id) {
        setItems((current) => current.filter((entry) => entry.id !== id))
      },
      setQuantity(id, quantity) {
        setItems((current) =>
          quantity < 1
            ? current.filter((entry) => entry.id !== id)
            : current.map((entry) => (entry.id === id ? { ...entry, quantity } : entry))
        )
      },
      clear() {
        setItems((current) => (current.length === 0 ? current : []))
      },
    }),
    [items, ready]
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
  }
}

export { formatMoney }
