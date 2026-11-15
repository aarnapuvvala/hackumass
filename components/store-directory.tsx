"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { storeDistances } from "@/app/actions"
import { useCart } from "@/components/cart-provider"
import FadeContent from "@/components/FadeContent"
import { Button, buttonVariants } from "@/components/ui/button"
import type { StoreAccount } from "@/lib/accounts"
import type { PantryDetail } from "@/lib/pantry"
import { cn } from "@/lib/utils"

type LocationState =
  | { status: "pending" }
  | { status: "ready"; lat: number; lon: number }
  | { status: "denied" }

export function StoreDirectory({
  stores,
  pantries,
}: {
  stores: StoreAccount[]
  pantries?: Record<string, PantryDetail>
}) {
  const cart = useCart()
  const [location, setLocation] = useState<LocationState>({ status: "pending" })
  const [distances, setDistances] = useState<Record<string, number | null> | null>(null)
  const [menuName, setMenuName] = useState<string | null>(null)

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

  const menuFoods = menuName ? pantries?.[menuName]?.foods ?? [] : null

  return (
    <>
    <p className="sr-only" aria-live="polite">
      {location.status === "pending"
        ? "Finding your location…"
        : location.status === "denied"
          ? "Location access is off, so distances stay hidden."
          : distances
            ? "Stores are sorted by distance."
            : "Calculating distance…"}
    </p>
    <FadeContent trigger="mount" duration={0.6} blur={8} className="flex flex-col">
    <ul className="flex flex-col gap-3">
      {ordered.map((store, index) => (
        <li
          key={`${store.name}-${store.address}-${index}`}
          className="store-card surface subtle-shadow card-hover flex flex-col gap-1 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 break-words font-semibold">{store.name}</h2>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {store.snapEligible ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950">
                  SNAP
                </span>
              ) : null}
              {store.category === "food_pantry" ? (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-950">
                  Food Bank
                </span>
              ) : null}
            </div>
          </div>
          <p className="break-words text-sm text-muted-foreground">{store.address}</p>
          <p className="text-sm tabular-nums">{distanceLabel(store.address, location, distances)}</p>
          {store.category === "food_pantry" ? (
            <div className="mt-2 flex flex-col items-start gap-2">
              <p className="text-sm text-muted-foreground">Food bank. Meals are free.</p>
              {pantries ? (
                <PantrySchedule
                  detail={pantries[store.name]}
                  onOpenMenu={() => setMenuName(store.name)}
                />
              ) : null}
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
                Add Meal
              </Button>
            </div>
          ) : (
            <Link
              href={`/menu?name=${encodeURIComponent(store.name)}&address=${encodeURIComponent(store.address)}`}
              className={cn(buttonVariants({ size: "sm" }), "mt-2 h-9 w-fit")}
            >
              View Menu
            </Link>
          )}
        </li>
      ))}
    </ul>
    </FadeContent>
    <PantryMenuDialog name={menuName} foods={menuFoods} onClose={() => setMenuName(null)} />
    </>
  )
}

function PantrySchedule({
  detail,
  onOpenMenu,
}: {
  detail: PantryDetail | undefined
  onOpenMenu: () => void
}) {
  const foods = detail?.foods ?? []
  if (detail && !detail.loaded) {
    return <p className="text-sm text-muted-foreground">Hours couldn’t be loaded. Try again in a moment.</p>
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="break-words text-sm">Days: {detail?.days || "Days aren’t posted"}</p>
      <p className="break-words text-sm">Hours: {detail?.hours || "Hours aren’t posted"}</p>
      {foods.length > 0 ? (
        <Button type="button" size="sm" variant="outline" onClick={onOpenMenu}>
          Menu
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Food isn’t posted</p>
      )}
    </div>
  )
}

function PantryMenuDialog({
  name,
  foods,
  onClose,
}: {
  name: string | null
  foods: string[] | null
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (foods && foods.length > 0 && !dialog.open) {
      dialog.showModal()
    }
    if ((!foods || foods.length === 0) && dialog.open) {
      dialog.close()
    }
  }, [foods])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-lenis-prevent
      className="app-dialog m-auto w-[min(100%-2rem,28rem)] rounded-xl border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/40"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="min-w-0 break-words text-lg font-semibold">
            {name}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {foods?.map((food) => (
            <li key={food} className="break-words text-sm">
              {food}
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  )
}

const mileFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

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
  return `${mileFormat.format(miles)} mi away`
}
