import { continueAsGuest, login } from "@/app/actions"
import { LoginForm } from "@/components/login-form"
import { Button } from "@/components/ui/button"

export default function CustomerPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Customer</h1>
        <p className="text-muted-foreground">
          Log in with a username and password to save your information, or
          continue as a guest.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Log in</h2>
        <LoginForm action={login} submitLabel="Log in" />
      </div>
      <form action={continueAsGuest}>
        <Button type="submit" variant="outline" size="lg" className="h-10 w-full">
          Continue as guest
        </Button>
      </form>
    </main>
  )
}
