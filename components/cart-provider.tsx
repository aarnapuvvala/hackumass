"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type CartItem = {
  id: string
  name: string
  detail: string
  quantity: number
}

type CartContextValue = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (id: string) => void
  setQuantity: (id: string, quantity: number) => void
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
          setItems(parsed.filter(isCartItem))
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
      addItem(item) {
        setItems((current) => {
          const existing = current.find((entry) => entry.id === item.id)
          if (!existing) {
            return [...current, { ...item, quantity: 1 }]
          }
          return current.map((entry) =>
            entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
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
    }),
    [items]
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

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.detail === "string" &&
    typeof item.quantity === "number"
  )
}
