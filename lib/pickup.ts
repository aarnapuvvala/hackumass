export function pickupAddress(item: { id: string; pickup?: string }) {
  const stored = item.pickup?.trim()
  if (stored) {
    return stored
  }
  const parts = item.id.split("|")
  if (parts.length < 3) {
    return ""
  }
  return parts.slice(1, -1).join("|").trim()
}
