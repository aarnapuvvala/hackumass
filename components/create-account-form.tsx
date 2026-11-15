"use client"

import { useActionState, useRef, useState, type FormEvent } from "react"
import { createAccount, type CreateAccountState } from "@/app/actions"
import { Button } from "@/components/ui/button"

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
  const [clientError, setClientError] = useState("")
  const licenseRef = useRef<HTMLInputElement>(null)

  async function uploadLicense(file: File | undefined) {
    setPhotoUrl("")
    setUploadError("")
    if (!file) {
      return
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose an image file, then upload it again.")
      return
    }
    if (file.size >= maxBytes) {
      setUploadError("Choose an image under 4 MB, then upload it again.")
      return
    }

    setUploading(true)
    try {
      const body = new FormData()
      body.set("file", file)
      body.set("purpose", "license")
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
    <form
      action={formAction}
      className="flex flex-col gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (uploading) {
          event.preventDefault()
          setClientError("Wait for the license photo to finish uploading.")
          return
        }
        if (role === "driver" && !photoUrl) {
          event.preventDefault()
          setClientError("Upload a photo of your driver’s license, then create the account.")
          licenseRef.current?.focus()
          return
        }
        setClientError("")
      }}
    >
      <input type="hidden" name="accountRole" value={role} />
      {role === "store" ? (
        <>
          <Field label="Name" name="name" autoComplete="organization" />
          <Field label="Address" name="address" autoComplete="street-address" />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
          />
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input
              name="snapEligible"
              type="checkbox"
              className="size-4 rounded border border-input"
            />
            SNAP Eligible
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
          <Field label="Car License Plate" name="licensePlate" autoComplete="off" spellCheck={false} />
          <Field label="Car Model" name="carModel" autoComplete="off" />
          <Field label="Car Color" name="carColor" autoComplete="off" />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Driver’s License
            <input
              ref={licenseRef}
              name="license"
              type="file"
              accept="image/*"
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

      {clientError ? (
        <p className="text-sm text-destructive" role="alert">
          {clientError}
        </p>
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
        disabled={pending || uploading}
      >
        {pending ? "Saving…" : "Create Account"}
      </Button>
    </form>
  )
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  spellCheck,
}: {
  label: string
  name: string
  type?: string
  autoComplete: string
  spellCheck?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        autoCapitalize={name === "username" ? "none" : undefined}
        spellCheck={spellCheck ?? (name === "username" ? false : undefined)}
        className="field"
      />
    </label>
  )
}
