import { connection } from "next/server"
import { readLicense } from "@/lib/licenses"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  await connection()
  const { filename } = await params
  const license = await readLicense(filename)
  if (!license) {
    return new Response("Not found", { status: 404 })
  }

  return new Response(new Uint8Array(license.bytes), {
    headers: {
      "Content-Type": license.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
