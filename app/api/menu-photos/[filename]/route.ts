import { connection } from "next/server"
import { readMenuPhoto } from "@/lib/menu-photos"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  await connection()
  const { filename } = await params
  const photo = await readMenuPhoto(filename)
  if (!photo) {
    return new Response("Not found", { status: 404 })
  }

  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
