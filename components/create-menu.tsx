"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import type { MenuSection, SnapStatus } from "@/lib/menu"

const fieldClassName =
  "h-10 rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const maxBytes = 4 * 1024 * 1024

const snapOptions: { value: SnapStatus; label: string }[] = [
  { value: "eligible", label: "SNAP eligible" },
  { value: "not-eligible", label: "Not eligible" },
  { value: "unsure", label: "Unsure" },
]

const snapLabels: Record<SnapStatus, string> = {
  eligible: "SNAP eligible",
  "not-eligible": "Not eligible",
  unsure: "Unsure",
}

export function CreateMenu({
  storeName,
  initialPhotoUrl,
  initialSections,
}: {
  storeName: string
  initialPhotoUrl: string
  initialSections: MenuSection[]
}) {
  const [sections, setSections] = useState(initialSections)
  const [menuPhotoUrl, setMenuPhotoUrl] = useState(initialPhotoUrl)
  const [photoUrl, setPhotoUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [menuError, setMenuError] = useState("")
  const [menuSaved, setMenuSaved] = useState(false)
  const [savingMenu, setSavingMenu] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [activeSection, setActiveSection] = useState(initialSections[0]?.id ?? "")

  async function uploadPhoto(file: File | undefined) {
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

  async function saveMenuPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading || !photoUrl) {
      return
    }
    setSavingPhoto(true)
    setPhotoError("")
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      })
      const result = (await response.json()) as { photoUrl?: string; error?: string }
      if (!response.ok || !result.photoUrl) {
        setPhotoError(result.error || "Could not save the menu photo.")
        return
      }
      setMenuPhotoUrl(result.photoUrl)
      setPhotoUrl("")
      event.currentTarget.reset()
    } catch {
      setPhotoError("Could not save the menu photo.")
    } finally {
      setSavingPhoto(false)
    }
  }

  function updateSection(id: string, patch: Partial<MenuSection>) {
    setMenuSaved(false)
    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, ...patch } : section))
    )
  }

  function updateItem(
    sectionId: string,
    itemId: string,
    patch: Partial<MenuSection["items"][number]>
  ) {
    setMenuSaved(false)
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item
              ),
            }
          : section
      )
    )
  }

  async function saveManualMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingMenu(true)
    setMenuError("")
    setMenuSaved(false)
    try {
      const response = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      })
      const result = (await response.json()) as { sections?: MenuSection[]; error?: string }
      if (!response.ok || !result.sections) {
        setMenuError(result.error || "Could not save the menu.")
        return
      }
      setSections(result.sections)
      setActiveSection((current) =>
        result.sections?.some((section) => section.id === current)
          ? current
          : (result.sections?.[0]?.id ?? "")
      )
      setMenuSaved(true)
    } catch {
      setMenuError("Could not save the menu.")
    } finally {
      setSavingMenu(false)
    }
  }

  function showSection(sectionId: string) {
    setActiveSection(sectionId)
    document.getElementById(`menu-section-${sectionId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-8 rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Create menu</h2>
            <p className="text-sm text-muted-foreground">
              Upload a photo of the menu, or build sections and items by hand.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setViewing((open) => !open)}>
            {viewing ? "Hide menu" : "View menu"}
          </Button>
        </div>

        <form onSubmit={saveMenuPhoto} className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">Menu photo</h3>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Photo of the menu
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => {
                void uploadPhoto(event.target.files?.[0])
              }}
              className="text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5"
            />
          </label>
          {uploading ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Uploading photo…
            </p>
          ) : null}
          {photoUrl ? (
            <p className="text-sm text-muted-foreground">Photo uploaded.</p>
          ) : null}
          {uploadError ? (
            <p className="text-sm text-destructive" role="alert">
              {uploadError}
            </p>
          ) : null}
          {photoError ? (
            <p className="text-sm text-destructive" role="alert">
              {photoError}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="h-10"
            disabled={uploading || !photoUrl || savingPhoto}
          >
            {savingPhoto ? "Saving…" : "Save menu photo"}
          </Button>
          {menuPhotoUrl ? (
            <img
              src={menuPhotoUrl}
              alt="Menu"
              className="max-h-80 w-full rounded-lg border border-border object-contain"
            />
          ) : null}
        </form>

        <form onSubmit={saveManualMenu} className="flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Build the menu by hand</h3>
            <p className="text-sm text-muted-foreground">
              Add sections, then add items with a price and SNAP eligibility.
            </p>
          </div>

          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections yet.</p>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Section
                  <input
                    value={section.name}
                    required
                    onChange={(event) => updateSection(section.id, { name: event.target.value })}
                    className={fieldClassName}
                  />
                </label>
                {section.items.map((item) => (
                  <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_7rem_11rem_auto]">
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Item
                      <input
                        value={item.name}
                        required
                        onChange={(event) =>
                          updateItem(section.id, item.id, { name: event.target.value })
                        }
                        className={fieldClassName}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Price
                      <input
                        value={item.price}
                        inputMode="decimal"
                        placeholder="4.99"
                        onChange={(event) =>
                          updateItem(section.id, item.id, { price: event.target.value })
                        }
                        className={fieldClassName}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      SNAP
                      <select
                        value={item.snap}
                        onChange={(event) =>
                          updateItem(section.id, item.id, {
                            snap: event.target.value as SnapStatus,
                          })
                        }
                        className={fieldClassName}
                      >
                        {snapOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="self-end"
                      onClick={() =>
                        updateSection(section.id, {
                          items: section.items.filter((entry) => entry.id !== item.id),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateSection(section.id, {
                        items: [
                          ...section.items,
                          {
                            id: crypto.randomUUID(),
                            name: "",
                            price: "",
                            snap: "unsure",
                            store: storeName,
                          },
                        ],
                      })
                    }
                  >
                    Add item
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setMenuSaved(false)
                      setSections((current) => current.filter((entry) => entry.id !== section.id))
                    }}
                  >
                    Remove section
                  </Button>
                </div>
              </div>
            ))
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMenuSaved(false)
              const id = crypto.randomUUID()
              setSections((current) => [...current, { id, name: "", items: [] }])
              setActiveSection((current) => current || id)
            }}
          >
            Add section
          </Button>

          {menuError ? (
            <p className="text-sm text-destructive" role="alert">
              {menuError}
            </p>
          ) : null}
          {menuSaved ? (
            <p className="text-sm text-muted-foreground" role="status">
              Menu saved.
            </p>
          ) : null}
          <Button type="submit" size="lg" className="h-10" disabled={savingMenu}>
            {savingMenu ? "Saving…" : "Save menu"}
          </Button>
        </form>
      </section>

      {viewing ? (
        <MenuView
          sections={sections}
          photoUrl={menuPhotoUrl}
          activeSection={activeSection}
          onSectionChange={showSection}
        />
      ) : null}
    </div>
  )
}

function MenuView({
  sections,
  photoUrl,
  activeSection,
  onSectionChange,
}: {
  sections: MenuSection[]
  photoUrl: string
  activeSection: string
  onSectionChange: (sectionId: string) => void
}) {
  const selected = sections.some((section) => section.id === activeSection)
    ? activeSection
    : (sections[0]?.id ?? "")

  return (
    <section id="menu-view" className="flex flex-col gap-6 rounded-xl border border-border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Menu</h2>
        <p className="text-sm text-muted-foreground">Jump to a section to see its items.</p>
      </div>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Menu"
          className="max-h-80 w-full rounded-lg border border-border object-contain"
        />
      ) : null}
      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sections yet.</p>
      ) : (
        <>
          <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium">
            Section
            <select
              value={selected}
              onChange={(event) => onSectionChange(event.target.value)}
              className={fieldClassName}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name || "Untitled section"}
                </option>
              ))}
            </select>
          </label>
          {sections.map((section) => (
            <div
              key={section.id}
              id={`menu-section-${section.id}`}
              className={
                section.id === selected
                  ? "flex scroll-mt-6 flex-col gap-2 rounded-lg border border-border p-3"
                  : "flex scroll-mt-6 flex-col gap-2"
              }
            >
              <h3 className="text-sm font-medium">{section.name || "Untitled section"}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Price</th>
                      <th className="px-3 py-2 font-medium">SNAP eligibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-muted-foreground">
                          No items in this section.
                        </td>
                      </tr>
                    ) : (
                      section.items.map((item) => (
                        <tr key={item.id} className="border-b border-border">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">{formatPrice(item.price)}</td>
                          <td className="px-3 py-2">{snapLabels[item.snap]}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

function formatPrice(price: string) {
  const trimmed = price.trim()
  if (!trimmed) {
    return ""
  }
  return trimmed.startsWith("$") ? trimmed : `$${trimmed}`
}
