import { put } from "@vercel/blob"

const maxBytes = 4 * 1024 * 1024

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose an image to upload." }, { status: 400 })
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "File must be an image." }, { status: 400 })
  }

  if (file.size >= maxBytes) {
    return Response.json({ error: "Image must be under 4 MB." }, { status: 400 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Blob storage is not configured. Add BLOB_READ_WRITE_TOKEN." },
      { status: 500 }
    )
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : ""
  const blob = await put(`licenses/${crypto.randomUUID()}${extension}`, file, {
    access: "public",
    contentType: file.type,
  })

  return Response.json({ url: blob.url })
}
