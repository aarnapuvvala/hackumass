import { readFileSync } from "node:fs"
import path from "node:path"

export type SnapStore = {
  name: string
  lat: number
  lon: number
}

type Row = [string, number, number]

const GRID = 0.5

let index: Map<string, Row[]> | null = null

function cellKey(lat: number, lon: number) {
  return `${Math.floor(lat / GRID)}:${Math.floor(lon / GRID)}`
}

function getIndex() {
  if (index) {
    return index
  }

  const filePath = path.join(process.cwd(), "data", "snap-stores.json")
  const rows = JSON.parse(readFileSync(filePath, "utf8")) as Row[]
  const buckets = new Map<string, Row[]>()
  for (const row of rows) {
    const key = cellKey(row[1], row[2])
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.push(row)
    } else {
      buckets.set(key, [row])
    }
  }
  index = buckets
  return buckets
}

export function snapStoresNear(lat: number, lon: number, delta = 0.035): SnapStore[] {
  const buckets = getIndex()
  const stores: SnapStore[] = []
  const latStart = Math.floor((lat - delta) / GRID)
  const latEnd = Math.floor((lat + delta) / GRID)
  const lonStart = Math.floor((lon - delta) / GRID)
  const lonEnd = Math.floor((lon + delta) / GRID)

  for (let latCell = latStart; latCell <= latEnd; latCell += 1) {
    for (let lonCell = lonStart; lonCell <= lonEnd; lonCell += 1) {
      const bucket = buckets.get(`${latCell}:${lonCell}`)
      if (!bucket) {
        continue
      }
      for (const [name, storeLat, storeLon] of bucket) {
        if (Math.abs(storeLat - lat) <= delta && Math.abs(storeLon - lon) <= delta) {
          stores.push({ name, lat: storeLat, lon: storeLon })
        }
      }
    }
  }

  return stores
}

export function isSamePlace(
  lat: number,
  lon: number,
  otherLat: number,
  otherLon: number,
  meters = 250
) {
  const dLat = (lat - otherLat) * 111_000
  const dLon = (lon - otherLon) * 111_000 * Math.cos((lat * Math.PI) / 180)
  return dLat * dLat + dLon * dLon <= meters * meters
}
