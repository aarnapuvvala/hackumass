"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Circle } from "lucide-react"
import { storeDistances } from "@/app/actions"
import { buttonVariants } from "@/components/ui/button"
import type { StoreAccount } from "@/lib/accounts"
import { cn } from "@/lib/utils"

type LocationState =
  | { status: "pending" }
  | { status: "ready"; lat: number; lon: number }
  | { status: "denied" }

export function StoreDirectory({ stores }: { stores: StoreAccount[] }) {
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
          className="flex flex-col gap-1 rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{store.name}</h2>
            {store.snapEligible ? (
              <Circle
                className="fill-yellow-400 text-yellow-500"
                aria-label="SNAP eligible"
              />
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{store.address}</p>
          <p className="text-sm">{distanceLabel(store.address, location, distances)}</p>
          <Link
            href={`/menu?name=${encodeURIComponent(store.name)}&address=${encodeURIComponent(store.address)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 w-fit")}
          >
            View menu
          </Link>
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
