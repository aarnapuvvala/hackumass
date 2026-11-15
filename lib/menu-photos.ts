import { readFile } from "node:fs/promises"
import path from "node:path"
import { Binary } from "mongodb"
import { mongoCollection } from "@/lib/mongo"

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

type MenuPhotoRecord = {
  _id: string
  contentType: string
  data: Binary
}

export async function saveMenuPhotoFile(filename: string, bytes: Buffer) {
  if (!menuPhotoPath(filename)) {
    throw new Error("Invalid menu photo filename.")
  }
  await saveMenuPhotoRecord(filename, bytes)
  return `/api/menu-photos/${filename}`
}

export async function readMenuPhoto(filename: string) {
  if (!menuPhotoPath(filename)) {
    return null
  }
  const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
  const contentType = contentTypes[extension] ?? "application/octet-stream"
  const stored = await readMenuPhotoRecord(filename, contentType)
  if (stored) {
    return stored
  }
  return readMenuPhotoFile(filename, contentType)
}

async function saveMenuPhotoRecord(filename: string, bytes: Buffer) {
  const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
  await (
    await mongoCollection<MenuPhotoRecord>("menuPhotos")
  ).updateOne(
    { _id: filename },
    {
      $set: {
        contentType: contentTypes[extension] ?? "application/octet-stream",
        data: new Binary(bytes),
      },
    },
    { upsert: true }
  )
}

async function readMenuPhotoFile(filename: string, contentType: string) {
  const filePath = menuPhotoPath(filename)
  if (!filePath) {
    return null
  }
  try {
    const bytes = await readFile(filePath)
    return { bytes, contentType }
  } catch {
    return null
  }
}

async function readMenuPhotoRecord(filename: string, contentType: string) {
  try {
    const record = await (await mongoCollection<MenuPhotoRecord>("menuPhotos")).findOne({
      _id: filename,
    })
    if (!record?.data) {
      return null
    }
    return { bytes: Buffer.from(record.data.value()), contentType: record.contentType || contentType }
  } catch (error) {
    console.error(
      "Could not read menu photo",
      error instanceof Error ? error.message : "unknown error"
    )
    return null
  }
}
