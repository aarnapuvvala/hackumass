import { get, put } from "@vercel/blob"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const remoteBins: Record<string, string> = {
  "accounts.json": "fdcbbbd",
  "menu.json": "cdaeeab",
}

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
}

function remoteConfigured() {
  return Boolean(process.env.VERCEL)
}

export async function readStoredJson(filename: string) {
  if (blobConfigured()) {
    const stored = await readBlob(filename)
    if (stored) {
      return stored
    }
  }

  if (remoteConfigured()) {
    const stored = await readRemote(filename)
    if (stored) {
      return stored
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

  if (remoteConfigured()) {
    await writeRemote(filename, body)
    return
  }

  const filePath = path.join(process.cwd(), "data", filename)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, body)
}

async function readBlob(filename: string) {
  const stored = await get(filename, { access: "private", useCache: false })
  if (stored?.statusCode === 200 && stored.stream) {
    return new Response(stored.stream).text()
  }
  return null
}

async function readRemote(filename: string) {
  const id = remoteBins[filename]
  if (!id) {
    return null
  }

  const response = await fetch(
    `https://extendsclass.com/api/json-storage/bin/${id}?t=${Date.now()}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  )
  if (!response.ok) {
    return null
  }

  return leadingJson(await response.text())
}

async function writeRemote(filename: string, body: string) {
  const id = remoteBins[filename]
  if (!id) {
    throw new Error("Could not save. This file has no remote store.")
  }

  const response = await fetch(`https://extendsclass.com/api/json-storage/bin/${id}`, {
    method: "PUT",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body,
  })
  const payload = leadingJson(await response.text())
  const status = payload ? (JSON.parse(payload) as { status?: unknown }).status : 1
  if (!response.ok || status !== 0) {
    throw new Error("Could not save the account. Try again in a moment.")
  }
}

function leadingJson(text: string) {
  const start = text.search(/[{[]/)
  if (start < 0) {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
    } else if (char === "{" || char === "[") {
      depth += 1
    } else if (char === "}" || char === "]") {
      depth -= 1
      if (depth === 0) {
        const value = text.slice(start, index + 1)
        try {
          JSON.parse(value)
        } catch {
          return null
        }
        return value
      }
    }
  }

  return null
}
