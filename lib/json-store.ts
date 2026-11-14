import { get, put } from "@vercel/blob"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export async function readStoredJson(filename: string) {
  if (blobConfigured()) {
    const stored = await get(filename, { access: "private", useCache: false })
    if (stored?.statusCode === 200 && stored.stream) {
      return new Response(stored.stream).text()
    }
  }

  try {
    return await readFile(path.join(process.cwd(), "data", filename), "utf8")
  } catch {
    return null
  }
}

export async function writeStoredJson(filename: string, body: string) {
  if (blobConfigured()) {
    await put(filename, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    })
    return
  }

  if (process.env.VERCEL) {
    throw new Error(
      "This deployment cannot save files. Connect a Vercel Blob store so new accounts can be stored."
    )
  }

  const filePath = path.join(process.cwd(), "data", filename)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, body)
}
