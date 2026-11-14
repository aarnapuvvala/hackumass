import { continueAsGuest, loginCustomer } from "@/app/actions"
import { LoginForm } from "@/components/login-form"
import { Button } from "@/components/ui/button"

export default function CustomerPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:max-w-4xl lg:flex-row lg:items-start lg:gap-16 lg:py-16">
      <div className="flex flex-col gap-2 lg:max-w-sm lg:flex-1 lg:pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Customer</h1>
        <p className="text-muted-foreground">
          Log in with a username and password to save your information, or
          continue as a guest.
        </p>
      </div>
      <div className="flex w-full flex-col gap-8 lg:max-w-md lg:flex-1">
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Log in</h2>
        <LoginForm action={loginCustomer} submitLabel="Log in" />
      </div>
      <form action={continueAsGuest}>
        <Button type="submit" variant="outline" size="lg" className="h-10 w-full">
          Continue as guest
        </Button>
      </form>
      </div>
    </main>
  )
}
