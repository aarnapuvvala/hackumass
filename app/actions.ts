"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { isSamePlace, snapStoresNear } from "@/lib/snap-stores"

const ROLES = ["customer", "driver", "store"] as const

type Role = (typeof ROLES)[number]

function isRole(value: string): value is Role {
  return ROLES.some((role) => role === value)
}

const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
}

export async function selectRole(formData: FormData) {
  const role = String(formData.get("role") ?? "")
  if (!isRole(role)) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set("role", role, cookieOptions)
  cookieStore.delete("auth")
  cookieStore.delete("customerStatus")
  cookieStore.delete("username")
  cookieStore.delete("password")
  redirect(`/${role}`)
}

export async function continueAsGuest() {
  const cookieStore = await cookies()
  cookieStore.set("role", "customer", cookieOptions)
  cookieStore.set("auth", "guest", cookieOptions)
  cookieStore.set("customerStatus", "guest", cookieOptions)
  cookieStore.delete("username")
  cookieStore.delete("password")
  redirect("/shopping")
}

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!username || !password) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set("username", username, cookieOptions)
  cookieStore.set("password", password, cookieOptions)
  cookieStore.set("auth", "login", cookieOptions)

  if (cookieStore.get("role")?.value === "customer") {
    cookieStore.set("customerStatus", "signed-in", cookieOptions)
    redirect("/shopping")
  }
}

export async function loginCustomer(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!username || !password) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set("role", "customer", cookieOptions)
  cookieStore.set("username", username, cookieOptions)
  cookieStore.set("password", password, cookieOptions)
  cookieStore.set("auth", "login", cookieOptions)
  cookieStore.set("customerStatus", "signed-in", cookieOptions)
  redirect("/shopping")
}

export type NearbyPlace = {
  id: number
  name: string
  kind: "restaurant" | "store"
  lat: number
  lon: number
  snap: boolean
}

export async function findNearbyPlaces(
  lat: number,
  lon: number
): Promise<NearbyPlace[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return []
  }

  const delta = 0.03
  const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`
  const searches: Record<string, string>[] = [
    { amenity: "restaurant" },
    { amenity: "cafe" },
    { amenity: "fast_food" },
    { q: "supermarket" },
  ]

  try {
    const batches = await Promise.all(
      searches.map((search) => searchPlaces(viewbox, search))
    )
    const seen = new Set<number>()
    const places = batches.flat().filter((place) => {
      if (seen.has(place.id)) {
        return false
      }
      seen.add(place.id)
      return true
    })
    const snapStores = snapStoresNear(lat, lon)
    const matched = new Set<number>()

    for (const place of places) {
      if (place.kind !== "store") {
        continue
      }
      const match = snapStores.findIndex(
        (store, index) =>
          !matched.has(index) && isSamePlace(place.lat, place.lon, store.lat, store.lon)
      )
      if (match >= 0) {
        place.snap = true
        matched.add(match)
      }
    }

    snapStores.forEach((store, index) => {
      if (matched.has(index)) {
        return
      }
      places.push({
        id: 1_000_000_000 + index,
        name: store.name,
        kind: "store",
        lat: store.lat,
        lon: store.lon,
        snap: true,
      })
    })

    const cookieStore = await cookies()
    const saved = snapStores.map((store) => ({
      name: store.name,
      lat: store.lat,
      lon: store.lon,
    }))
    let value = JSON.stringify(saved)
    if (value.length > 3800) {
      value = JSON.stringify(saved.slice(0, 40).map((store) => store.name))
    }
    cookieStore.set("SNAPstore", value, cookieOptions)

    return places
  } catch {
    return []
  }
}

async function searchPlaces(
  viewbox: string,
  search: { amenity?: string; q?: string }
): Promise<NearbyPlace[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "8")
  url.searchParams.set("viewbox", viewbox)
  url.searchParams.set("bounded", "1")
  for (const [key, value] of Object.entries(search)) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "hackumass-1/0.1 (hackathon demo)",
    },
  })
  if (!response.ok) {
    return []
  }

  const results = (await response.json()) as Array<{
    place_id: number
    lat: string
    lon: string
    name?: string
    category?: string
  }>

  return results.flatMap((place) => {
    const placeLat = Number(place.lat)
    const placeLon = Number(place.lon)
    if (!Number.isFinite(placeLat) || !Number.isFinite(placeLon)) {
      return []
    }
    const isStore = place.category === "shop"
    return [
      {
        id: place.place_id,
        name: place.name || (isStore ? "Store" : "Restaurant"),
        kind: isStore ? ("store" as const) : ("restaurant" as const),
        lat: placeLat,
        lon: placeLon,
        snap: false,
      },
    ]
  })
}
