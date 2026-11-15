import { Button } from "@/components/ui/button"

export function LoginForm({
  action,
  submitLabel,
  redirectTo,
}: {
  action: (formData: FormData) => void | Promise<void>
  submitLabel: string
  redirectTo?: "/account-store" | "/customer_account" | "/driver_account"
}) {
  const usernameLabel = redirectTo === "/account-store" ? "Store name" : "Username"

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
          autoCapitalize="none"
          spellCheck={false}
          className="field"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </label>
      <Button type="submit" size="lg" className="h-11">
        {submitLabel}
      </Button>
    </form>
  )
}
