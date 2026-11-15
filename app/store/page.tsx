import { Suspense } from "react"
import Link from "next/link"
import { login } from "@/app/actions"
import { AccountCreatedNotice } from "@/components/account-created-notice"
import { LoginForm } from "@/components/login-form"
import { PageFrame, PageIntro } from "@/components/page-frame"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string | string[] }>
}) {
  return (
    <PageFrame>
      <PageIntro
        kicker="Store"
        title="Sign In"
        description="Log in with your store name and password to edit the menu."
      />
      <section className="surface subtle-shadow flex flex-col gap-4 p-5">
        <Suspense>
          <AccountCreatedNotice
            searchParams={searchParams}
            message="Account created. Log in with your store name and password."
          />
        </Suspense>
        <LoginForm action={login} submitLabel="Log In" redirectTo="/account-store" />
      </section>
      <Link
        href="/account"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 w-full")}
      >
        Create an Account
      </Link>
    </PageFrame>
  )
}
