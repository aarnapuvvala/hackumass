"use client"

import { useActionState, useState } from "react"
import { createAccount, type CreateAccountState } from "@/app/actions"
import { Button } from "@/components/ui/button"

const fieldClassName =
  "h-10 rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const maxBytes = 4 * 1024 * 1024

export function CreateAccountForm({
  role,
}: {
  role: "customer" | "driver" | "store"
}) {
  const [state, formAction, pending] = useActionState<CreateAccountState, FormData>(
    createAccount,
    null
  )
  const [photoUrl, setPhotoUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  async function uploadLicense(file: File | undefined) {
    setPhotoUrl("")
    setUploadError("")
    if (!file) {
      return
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("File must be an image.")
      return
    }
    if (file.size >= maxBytes) {
      setUploadError("Image must be under 4 MB.")
      return
    }

    setUploading(true)
    try {
      const body = new FormData()
      body.set("file", file)
      const response = await fetch("/api/upload", { method: "POST", body })
      const result = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !result.url) {
        setUploadError(result.error || "Upload failed.")
        return
      }
      setPhotoUrl(result.url)
    } catch {
      setUploadError("Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {role === "store" ? (
        <>
          <Field label="Name" name="name" autoComplete="organization" />
          <Field label="Address" name="address" autoComplete="street-address" />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              name="snapEligible"
              type="checkbox"
              className="size-4 rounded border border-input"
            />
            SNAP eligible
          </label>
        </>
      ) : (
        <>
          <Field label="Username" name="username" autoComplete="username" />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
          />
        </>
      )}

      {role === "driver" ? (
        <>
          <Field label="Car license plate" name="licensePlate" autoComplete="off" />
          <Field label="Car model" name="carModel" autoComplete="off" />
          <Field label="Car color" name="carColor" autoComplete="off" />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Driver&apos;s license
            <input
              type="file"
              accept="image/*"
              required={!photoUrl}
              disabled={uploading}
              onChange={(event) => {
                void uploadLicense(event.target.files?.[0])
              }}
              className="text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5"
            />
          </label>
          <input type="hidden" name="photoUrl" value={photoUrl} />
          {uploading ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Uploading license photo…
            </p>
          ) : null}
          {photoUrl ? (
            <p className="text-sm text-muted-foreground">License photo uploaded.</p>
          ) : null}
          {uploadError ? (
            <p className="text-sm text-destructive" role="alert">
              {uploadError}
            </p>
          ) : null}
        </>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-muted-foreground" role="status">
          Account saved.
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="h-10"
        disabled={pending || uploading || (role === "driver" && !photoUrl)}
      >
        {pending ? "Saving…" : "Create account"}
      </Button>
    </form>
  )
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string
  name: string
  type?: string
  autoComplete: string
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className={fieldClassName}
      />
    </label>
  )
}
