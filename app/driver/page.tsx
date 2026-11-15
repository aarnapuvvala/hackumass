import Link from "next/link"
import { login } from "@/app/actions"
import { LoginForm } from "@/components/login-form"
import { PageFrame, PageIntro } from "@/components/page-frame"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function DriverPage() {
  return (
    <PageFrame>
      <PageIntro
        kicker="Driver"
        title="Sign In"
        description="Log in with a username and password to see open deliveries."
      />
      <section className="surface subtle-shadow p-5">
        <LoginForm action={login} submitLabel="Log In" redirectTo="/driver_account" />
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
