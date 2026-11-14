import { Button } from "@/components/ui/button"

export function LoginForm({
  action,
  submitLabel,
  redirectTo,
  usernameLabel = "Username",
}: {
  action: (formData: FormData) => void | Promise<void>
  submitLabel: string
  redirectTo?: "/account-store" | "/customer_account"
  usernameLabel?: string
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {usernameLabel}
        <input
          name="username"
          type="text"
          required
          autoComplete="username"
          className="h-10 rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-10 rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <Button type="submit" size="lg" className="h-10">
        {submitLabel}
      </Button>
    </form>
  )
}
