import { Suspense } from "react"
import Link from "next/link"
import { cookies } from "next/headers"
import { CreateAccountForm } from "@/components/create-account-form"
import { PageFrame, PageIntro } from "@/components/page-frame"

const titles = {
  customer: "Create a Customer Account",
  driver: "Create a Driver Account",
  store: "Create a Store Account",
} as const

export default function AccountPage() {
  return (
    <PageFrame>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading account form…</p>}>
        <AccountDetails />
      </Suspense>
    </PageFrame>
  )
}

async function AccountDetails() {
  const cookieStore = await cookies()
  const role = cookieStore.get("role")?.value

  if (role !== "customer" && role !== "driver" && role !== "store") {
    return (
      <div className="flex flex-col gap-4">
        <PageIntro
          title="Create an Account"
          description="Choose a role before you create an account."
        />
        <Link href="/" className="text-sm font-medium underline-offset-4 hover:underline">
          Choose a Role
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={titles[role]}
        description={`Save this information for the ${role} role.`}
      />
      <CreateAccountForm role={role} />
    </div>
  )
}
