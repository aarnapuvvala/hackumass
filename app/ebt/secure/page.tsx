"use client"

import { useEffect, useRef, useState } from "react"
import { checkoutFrameSource, ebtFrameSource } from "@/lib/checkout"
import { Button } from "@/components/ui/button"

const fieldClassName =
  "h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none"

export default function EbtSecurePage() {
  const [pan, setPan] = useState("")
  const [pin, setPin] = useState("")
  const [status, setStatus] = useState(
    "The PIN is entered here and is not stored with the order."
  )
  const [busy, setBusy] = useState(false)
  const panRef = useRef("")
  const pinRef = useRef("")

  useEffect(() => {
    const header = document.querySelector("header")
    if (header instanceof HTMLElement) {
      header.hidden = true
    }
    return () => {
      if (header instanceof HTMLElement) {
        header.hidden = false
      }
    }
  }, [])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  useEffect(() => {
    pinRef.current = pin
  }, [pin])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return
      }
      const data = event.data as {
        source?: string
        type?: string
        id?: number
        amountCents?: number
        checkoutId?: string
      }
      if (data?.source !== checkoutFrameSource) {
        return
      }
      if (data.type === "reset") {
        setPin("")
        setStatus("The EBT charge was canceled. Enter the PIN again to pay.")
        setBusy(false)
        return
      }
      if (data.type !== "charge") {
        return
      }
      void charge(data.id ?? 0, data.amountCents ?? 0, data.checkoutId ?? "")
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  function post(message: Record<string, unknown>) {
    window.parent.postMessage({ source: ebtFrameSource, ...message }, window.location.origin)
  }

  async function charge(id: number, amountCents: number, checkoutId: string) {
    const card = panRef.current.replace(/\D/g, "")
    const secret = pinRef.current.replace(/\D/g, "")
    if (!/^\d{16,19}$/.test(card) || !/^\d{4}$/.test(secret)) {
      post({
        type: "error",
        id,
        message: "Enter the EBT card number and PIN in the secure field.",
      })
      return
    }

    setBusy(true)
    setStatus("Authorizing EBT…")
    try {
      const response = await fetch("/api/ebt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "charge",
          pan: card,
          pin: secret,
          amountCents,
          checkoutId,
        }),
      })
      const body = (await response.json()) as {
        error?: string
        chargeId?: string
        last4?: string
        amountCents?: number
        remainingBalanceCents?: number
      }
      if (!response.ok || !body.chargeId || !body.last4) {
        setStatus(body.error || "EBT payment failed.")
        post({ type: "error", id, message: body.error || "EBT payment failed." })
        return
      }
      setPin("")
      setStatus("EBT payment authorized. The PIN was not saved.")
      post({
        type: "charged",
        id,
        chargeId: body.chargeId,
        last4: body.last4,
        amountCents: body.amountCents,
        remainingBalanceCents: body.remainingBalanceCents,
      })
    } catch {
      setStatus("EBT payment failed.")
      post({ type: "error", id, message: "EBT payment failed." })
    } finally {
      setBusy(false)
    }
  }

  async function checkBalance() {
    const card = pan.replace(/\D/g, "")
    const secret = pin.replace(/\D/g, "")
    if (!/^\d{16,19}$/.test(card) || !/^\d{4}$/.test(secret)) {
      setStatus("Enter a 16–19 digit card number and a 4-digit PIN.")
      return
    }
    setBusy(true)
    try {
      const response = await fetch("/api/ebt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "balance", pan: card, pin: secret }),
      })
      const body = (await response.json()) as {
        error?: string
        last4?: string
        balanceCents?: number
      }
      if (!response.ok || typeof body.balanceCents !== "number" || !body.last4) {
        setStatus(body.error || "Balance check failed.")
        return
      }
      setPin("")
      setStatus("Balance checked. Enter the PIN again to pay.")
      post({ type: "balance", last4: body.last4, balanceCents: body.balanceCents })
    } catch {
      setStatus("Balance check failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-3 bg-white p-1 text-neutral-900"
      onSubmit={(event) => {
        event.preventDefault()
        void checkBalance()
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        EBT card number
        <input
          value={pan}
          onChange={(event) => setPan(event.target.value)}
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="16–19 digits"
          aria-label="EBT card number"
          className={fieldClassName}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        PIN
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="4 digits"
          aria-label="EBT PIN"
          className={fieldClassName}
        />
      </label>
      <Button type="submit" variant="outline" className="h-10" disabled={busy}>
        {busy ? "Contacting EBT…" : "Check balance"}
      </Button>
      <p className="text-xs text-neutral-600">{status}</p>
    </form>
  )
}
