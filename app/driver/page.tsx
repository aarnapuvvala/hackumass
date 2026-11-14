import { login } from "@/app/actions"
import { LoginForm } from "@/components/login-form"

export default function DriverPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:max-w-4xl lg:flex-row lg:items-start lg:gap-16 lg:py-16">
      <div className="flex flex-col gap-2 lg:max-w-sm lg:flex-1 lg:pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Driver</h1>
        <p className="text-muted-foreground">
          Log in with a username and password.
        </p>
      </div>
      <div className="w-full lg:max-w-md lg:flex-1">
        <LoginForm action={login} submitLabel="Log in" />
      </div>
    </main>
  )
}
