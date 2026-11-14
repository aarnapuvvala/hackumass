const geocodeCache = new Map<string, { lat: number; lon: number } | null>()

export function milesBetween(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(toLat - fromLat)
  const dLon = toRad(toLon - fromLon)
  const lat1 = toRad(fromLat)
  const lat2 = toRad(toLat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export async function geocodeAddress(address: string) {
  const key = address.trim().toLowerCase()
  if (!key) {
    return null
  }
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) ?? null
  }

  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "1")
  url.searchParams.set("q", address)

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "HackUMass grocery app (student project)",
      },
      next: { revalidate: 60 * 60 * 24 },
    })
    if (!response.ok) {
      geocodeCache.set(key, null)
      return null
    }
    const results = (await response.json()) as { lat?: string; lon?: string }[]
    const lat = Number(results[0]?.lat)
    const lon = Number(results[0]?.lon)
    const point = Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
    geocodeCache.set(key, point)
    return point
  } catch {
    return null
  }
}
