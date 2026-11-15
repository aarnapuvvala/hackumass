import { continueAsGuest, login, startCustomerSignup } from "@/app/actions"
import { LoginForm } from "@/components/login-form"
import { PageFrame, PageIntro } from "@/components/page-frame"
import { Button } from "@/components/ui/button"

export default function CustomerPage() {
  return (
    <PageFrame>
      <PageIntro
        kicker="Customer"
        title="Sign In"
        description="Log in with a username and password to save your information, or continue as a guest."
      />
      <section className="surface subtle-shadow flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold">Log In</h2>
        <LoginForm action={login} submitLabel="Log In" redirectTo="/customer_account" />
      </section>
      <form action={startCustomerSignup}>
        <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
          Create an Account
        </Button>
      </form>
      <form action={continueAsGuest}>
        <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
          Continue as Guest
        </Button>
      </form>
    </PageFrame>
  )
}
