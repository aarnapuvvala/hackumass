import Link from "next/link"
import { login } from "@/app/actions"
import { LoginForm } from "@/components/login-form"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function StorePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
        <p className="text-muted-foreground">
          Log in with a username and password.
        </p>
      </div>
      <LoginForm action={login} submitLabel="Log in" redirectTo="/account-store" />
      <Link
        href="/account"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 w-full")}
      >
        Create an account
      </Link>
    </main>
  )
}
