import { Suspense } from "react"
import Link from "next/link"
import { cookies } from "next/headers"
import { CreateAccountForm } from "@/components/create-account-form"

const titles = {
  customer: "Create a customer account",
  driver: "Create a driver account",
  store: "Create a store account",
} as const

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading account form…</p>}>
        <AccountDetails />
      </Suspense>
    </main>
  )
}

async function AccountDetails() {
  const cookieStore = await cookies()
  const role = cookieStore.get("role")?.value

  if (role !== "customer" && role !== "driver" && role !== "store") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground">Choose a role before creating an account.</p>
        <Link href="/" className="text-sm font-medium underline-offset-4 hover:underline">
          Choose a role
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{titles[role]}</h1>
        <p className="text-muted-foreground">
          This information is saved for the {role} role.
        </p>
      </div>
      <CreateAccountForm role={role} />
    </div>
  )
}
