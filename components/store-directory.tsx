"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { storeDistances } from "@/app/actions"
import { useCart } from "@/components/cart-provider"
import { Button, buttonVariants } from "@/components/ui/button"
import type { StoreAccount } from "@/lib/accounts"
import { cn } from "@/lib/utils"

type LocationState =
  | { status: "pending" }
  | { status: "ready"; lat: number; lon: number }
  | { status: "denied" }

export function StoreDirectory({ stores }: { stores: StoreAccount[] }) {
  const cart = useCart()
  const [location, setLocation] = useState<LocationState>({ status: "pending" })
  const [distances, setDistances] = useState<Record<string, number | null> | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ status: "denied" })
      return
    }

    const timeout = window.setTimeout(() => {
      setLocation((current) => (current.status === "pending" ? { status: "denied" } : current))
    }, 8000)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeout)
        setLocation({
          status: "ready",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
      },
      () => {
        window.clearTimeout(timeout)
        setLocation({ status: "denied" })
      }
    )

    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (location.status !== "ready" || stores.length === 0) {
      return
    }

    let cancelled = false
    void storeDistances(
      location.lat,
      location.lon,
      stores.map((store) => store.address)
    ).then((result) => {
      if (!cancelled) {
        setDistances(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [location, stores])

  if (stores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No stores have created an account yet.
      </p>
    )
  }

  const ordered = [...stores].sort((a, b) => {
    const aDistance = distances?.[a.address.trim()]
    const bDistance = distances?.[b.address.trim()]
    if (typeof aDistance !== "number" && typeof bDistance !== "number") {
      return 0
    }
    if (typeof aDistance !== "number") {
      return 1
    }
    if (typeof bDistance !== "number") {
      return -1
    }
    return aDistance - bDistance
  })

  return (
    <ul className="flex flex-col gap-3">
      {ordered.map((store, index) => (
        <li
          key={`${store.name}-${store.address}-${index}`}
          className="surface subtle-shadow card-hover flex flex-col gap-1 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{store.name}</h2>
            <div className="flex shrink-0 items-center gap-1.5">
              {store.snapEligible ? (
                <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-center text-[10px] font-semibold leading-tight text-yellow-950">
                  SNAP
                </span>
              ) : null}
              {store.category === "food_pantry" ? (
                <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1 text-center text-[10px] font-semibold leading-tight text-white">
                  food bank
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{store.address}</p>
          <p className="text-sm">{distanceLabel(store.address, location, distances)}</p>
          {store.category === "food_pantry" ? (
            <div className="mt-2 flex flex-col items-start gap-2">
              <p className="text-sm text-muted-foreground">Food bank. Meals are free.</p>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  cart.addItem({
                    id: `pantry|${store.address}|${store.name}|meal`,
                    name: "Meal",
                    detail: store.name,
                    price: 0,
                    pickup: store.address,
                    snapEligible: false,
                  })
                }
              >
                Add meal
              </Button>
            </div>
          ) : (
            <Link
              href={`/menu?name=${encodeURIComponent(store.name)}&address=${encodeURIComponent(store.address)}`}
              className={cn(buttonVariants({ size: "sm" }), "mt-2 w-fit")}
            >
              View menu
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}

function distanceLabel(
  address: string,
  location: LocationState,
  distances: Record<string, number | null> | null
) {
  if (location.status === "pending") {
    return "Finding your location…"
  }
  if (location.status === "denied") {
    return "Allow location access to see distance."
  }
  if (!distances) {
    return "Calculating distance…"
  }
  const miles = distances[address.trim()]
  if (typeof miles !== "number") {
    return "Distance unavailable"
  }
  return `${miles.toFixed(1)} mi away`
}
