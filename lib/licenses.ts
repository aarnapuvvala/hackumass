import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const licensesDir = path.join(process.cwd(), "data", "licenses")

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
}

const filenamePattern = /^[0-9a-f-]{36}\.(jpg|jpeg|png|gif|webp|heic|heif)$/i

export function licenseFilename(file: File) {
  const fromType = extensions[file.type]
  const fromName = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
    : ""
  const extension = fromType ?? (fromName in contentTypes ? fromName : "")
  if (!extension) {
    return null
  }
  return `${crypto.randomUUID()}.${extension}`
}

export function licensePath(filename: string) {
  if (!filenamePattern.test(filename)) {
    return null
  }
  return path.join(licensesDir, filename)
}

export function isStoredLicense(value: string) {
  const filename = value.startsWith("/api/licenses/") ? value.slice("/api/licenses/".length) : ""
  return filenamePattern.test(filename)
}

export async function saveLicense(filename: string, bytes: Buffer) {
  const filePath = licensePath(filename)
  if (!filePath) {
    throw new Error("Invalid license filename.")
  }
  await mkdir(licensesDir, { recursive: true })
  await writeFile(filePath, bytes)
  return `/api/licenses/${filename}`
}

export async function readLicense(filename: string) {
  const filePath = licensePath(filename)
  if (!filePath) {
    return null
  }
  try {
    const bytes = await readFile(filePath)
    const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
    return {
      bytes,
      contentType: contentTypes[extension] ?? "application/octet-stream",
    }
  } catch {
    return null
  }
}
