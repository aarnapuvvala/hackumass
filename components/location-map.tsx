"use client"

import { useEffect, useRef, useState } from "react"
import type { Map as LeafletMap } from "leaflet"
import "leaflet/dist/leaflet.css"
import { findNearbyPlaces, type NearbyPlace } from "@/app/actions"

const FALLBACK = { lat: 42.3868, lon: -72.5301, label: "Amherst, MA" }

export function LocationMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const [places, setPlaces] = useState<NearbyPlace[]>([])
  const [message, setMessage] = useState("Finding your location…")

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    let cancelled = false
    let resizeObserver: ResizeObserver | undefined

    async function load() {
      const leaflet = await import("leaflet")
      if (cancelled || !container) {
        return
      }

      const position = await readLocation()
      if (cancelled) {
        return
      }

      const map = leaflet.map(container).setView([position.lat, position.lon], 15)
      mapRef.current = map
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        })
        .addTo(map)
      leaflet
        .circleMarker([position.lat, position.lon], {
          radius: 8,
          color: "#111",
          fillColor: "#111",
          fillOpacity: 1,
        })
        .addTo(map)
        .bindPopup(position.label)
      map.invalidateSize()
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize()
      })
      resizeObserver.observe(container)

      setMessage(
        position.usedFallback
          ? "Location access is off, so the map is centered on Amherst. Nearby places are loading."
          : "Loading restaurants and stores near you…"
      )

      const nearby = await findNearbyPlaces(position.lat, position.lon)
      if (cancelled) {
        return
      }

      nearby.forEach((place) => {
        leaflet
          .circleMarker([place.lat, place.lon], {
            radius: 7,
            color: place.kind === "store" ? "#2563eb" : "#b45309",
            fillColor: place.kind === "store" ? "#2563eb" : "#b45309",
            fillOpacity: 0.9,
          })
          .addTo(map)
          .bindPopup(`${place.name} (${place.kind})`)
      })

      if (nearby.length > 0) {
        map.fitBounds(
          leaflet.latLngBounds([
            [position.lat, position.lon],
            ...nearby.map((place) => [place.lat, place.lon] as [number, number]),
          ]),
          { padding: [24, 24] }
        )
      }

      setPlaces(nearby)
      setMessage(
        nearby.length > 0
          ? `${nearby.length} restaurants and stores near ${position.label}.`
          : `No restaurants or stores were found near ${position.label}.`
      )
    }

    load().catch(() => {
      if (!cancelled) {
        setMessage("The map could not load. Try again in a moment.")
      }
    })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <section className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.7fr)] lg:items-start">
      <div className="overflow-hidden rounded-xl border border-border bg-muted">
        <div ref={containerRef} className="h-72 w-full sm:h-96 lg:h-[min(70vh,40rem)]" />
      </div>
      <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      {places.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {places.map((place) => (
            <li
              key={place.id}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="font-medium">{place.name}</span>
              <span className="text-muted-foreground"> · {place.kind}</span>
            </li>
          ))}
        </ul>
      ) : null}
      </div>
    </section>
  )
}

function readLocation(): Promise<{
  lat: number
  lon: number
  label: string
  usedFallback: boolean
}> {
  if (!navigator.geolocation) {
    return Promise.resolve({ ...FALLBACK, usedFallback: true })
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          label: "your location",
          usedFallback: false,
        })
      },
      () => resolve({ ...FALLBACK, usedFallback: true }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    )
  })
}
