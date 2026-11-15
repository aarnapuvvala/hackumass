"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import type { MenuSection, SnapStatus } from "@/lib/menu"

const fieldClassName = "field"

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
  const [photoMenuNote, setPhotoMenuNote] = useState("")
  const [savingMenu, setSavingMenu] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [activeSection, setActiveSection] = useState(initialSections[0]?.id ?? "")
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) {
      return
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  async function uploadPhoto(file: File | undefined) {
    setPhotoUrl("")
    setUploadError("")
    if (!file) {
      return
    }
    if (file.type !== "image/jpeg" && file.type !== "image/jpg" && file.type !== "image/png") {
      setUploadError("Use a JPG or PNG photo so the menu can be read.")
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
      body.set("purpose", "menu")
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
    if (uploading) {
      return
    }
    if (!photoUrl) {
      setPhotoError("Choose a menu photo, then save it.")
      return
    }
    setSavingPhoto(true)
    setPhotoError("")
    const form = event.currentTarget
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      })
      const result = (await response.json()) as {
        photoUrl?: string
        sections?: MenuSection[]
        error?: string
      }
      if (!response.ok || !result.photoUrl) {
        setPhotoError(result.error || "Could not save the menu photo.")
        return
      }
      setMenuPhotoUrl(result.photoUrl)
      setPhotoUrl("")
      if (result.sections && result.sections.length > 0) {
        setSections(result.sections)
        setActiveSection(result.sections[0]?.id ?? "")
        setDirty(false)
        setMenuSaved(false)
        setMenuError("")
        setPhotoMenuNote("Menu created from the photo. Review the items below.")
        setPhotoError("")
      }
      if (result.error) {
        setPhotoMenuNote("")
        setPhotoError(result.error)
      }
      form.reset()
    } catch {
      setPhotoError("The menu request did not finish. Leave the page open for about a minute, then try Save Menu Photo again.")
    } finally {
      setSavingPhoto(false)
    }
  }

  function updateSection(id: string, patch: Partial<MenuSection>) {
    setDirty(true)
    setMenuSaved(false)
    setPhotoMenuNote("")
    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, ...patch } : section))
    )
  }

  function updateItem(
    sectionId: string,
    itemId: string,
    patch: Partial<MenuSection["items"][number]>
  ) {
    setDirty(true)
    setMenuSaved(false)
    setPhotoMenuNote("")
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
      setDirty(false)
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
      <section className="surface subtle-shadow flex flex-col gap-8 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Create Menu</h2>
            <p className="text-sm text-muted-foreground">
              Upload a JPG or PNG of the menu. Categories, names, prices, and printed SNAP marks are kept. Unmarked items follow SNAP rules.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setViewing((open) => !open)}>
            {viewing ? "Hide Menu" : "View Menu"}
          </Button>
        </div>

        <form onSubmit={saveMenuPhoto} className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">Menu Photo</h3>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Photo of the Menu
            <input
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
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
          {savingPhoto ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Reading the menu. This usually takes about a minute. Leave this page open.
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
            disabled={uploading || savingPhoto}
          >
            {savingPhoto ? "Reading menu…" : "Save Menu Photo"}
          </Button>
          {menuPhotoUrl ? (
            <img
              src={menuPhotoUrl}
              alt={`Printed menu for ${storeName}`}
              width={960}
              height={720}
              loading="lazy"
              className="h-auto max-h-80 w-full rounded-lg border border-border object-contain"
            />
          ) : null}
        </form>

        <form onSubmit={saveManualMenu} className="flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Build the menu by hand</h3>
            <p className="text-sm text-muted-foreground">
              Add sections, then add items with a price and SNAP eligibility.
            </p>
            {photoMenuNote ? (
              <p className="text-sm text-muted-foreground" role="status">
                {photoMenuNote}
              </p>
            ) : null}
          </div>

          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections yet.</p>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Section
                  <input
                    name={`section-${section.id}`}
                    value={section.name}
                    required
                    autoComplete="off"
                    onChange={(event) => updateSection(section.id, { name: event.target.value })}
                    className={fieldClassName}
                  />
                </label>
                {section.items.map((item) => (
                  <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_7rem_11rem_auto]">
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Item
                      <input
                        name={`item-${item.id}`}
                        value={item.name}
                        required
                        autoComplete="off"
                        onChange={(event) =>
                          updateItem(section.id, item.id, { name: event.target.value })
                        }
                        className={fieldClassName}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Price
                      <input
                        name={`price-${item.id}`}
                        value={item.price}
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="4.99…"
                        onChange={(event) =>
                          updateItem(section.id, item.id, { price: event.target.value })
                        }
                        className={fieldClassName}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      SNAP
                      <select
                        name={`snap-${item.id}`}
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
                      aria-label={`Remove ${item.name || "item"}`}
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
                    Add Item
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove ${section.name || "section"}`}
                    onClick={() => {
                      setDirty(true)
                      setMenuSaved(false)
                      setPhotoMenuNote("")
                      setSections((current) => current.filter((entry) => entry.id !== section.id))
                    }}
                  >
                    Remove Section
                  </Button>
                </div>
              </div>
            ))
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDirty(true)
              setMenuSaved(false)
              setPhotoMenuNote("")
              const id = crypto.randomUUID()
              setSections((current) => [...current, { id, name: "", items: [] }])
              setActiveSection((current) => current || id)
            }}
          >
            Add Section
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
            {savingMenu ? "Saving…" : "Save Menu"}
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
    <section id="menu-view" className="surface subtle-shadow flex flex-col gap-6 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Menu</h2>
        <p className="text-sm text-muted-foreground">Jump to a section to see its items.</p>
      </div>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Printed menu"
          width={960}
          height={720}
          loading="lazy"
          className="h-auto max-h-80 w-full rounded-lg border border-border object-contain"
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
                      <th scope="col" className="px-3 py-2 font-medium">Item</th>
                      <th scope="col" className="px-3 py-2 font-medium">Price</th>
                      <th scope="col" className="px-3 py-2 font-medium">SNAP Eligibility</th>
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
                          <td className="break-words px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2 tabular-nums">{formatPrice(item.price)}</td>
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
