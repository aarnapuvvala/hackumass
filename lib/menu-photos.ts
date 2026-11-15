import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const photosDir = path.join(process.cwd(), "data", "menu-photos")

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

export function menuPhotoFilename(file: File) {
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

export function menuPhotoPath(filename: string) {
  if (!filenamePattern.test(filename)) {
    return null
  }
  return path.join(photosDir, filename)
}

export function isStoredMenuPhoto(value: string) {
  const filename = value.startsWith("/api/menu-photos/")
    ? value.slice("/api/menu-photos/".length)
    : ""
  return filenamePattern.test(filename)
}

export async function saveMenuPhotoFile(filename: string, bytes: Buffer) {
  const filePath = menuPhotoPath(filename)
  if (!filePath) {
    throw new Error("Invalid menu photo filename.")
  }
  await mkdir(photosDir, { recursive: true })
  await writeFile(filePath, bytes)
  return `/api/menu-photos/${filename}`
}

export async function readMenuPhoto(filename: string) {
  const filePath = menuPhotoPath(filename)
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
