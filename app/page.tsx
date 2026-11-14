import { Store, Truck, UserRound } from "lucide-react"
import { selectRole } from "@/app/actions"
import { Button } from "@/components/ui/button"

const roles = [
  {
    role: "customer",
    title: "Customer",
    description: "Order as a guest or sign in to save your information.",
    icon: UserRound,
  },
  {
    role: "driver",
    title: "Driver",
    description: "Sign in with a username and password.",
    icon: Truck,
  },
  {
    role: "store",
    title: "Store",
    description: "Sign in with a username and password.",
    icon: Store,
  },
] as const

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Choose a role</h1>
        <p className="max-w-xl text-muted-foreground">
          Pick how you want to continue. Your choice is saved in a role cookie.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {roles.map(({ role, title, description, icon: Icon }) => (
          <form key={role} action={selectRole} className="flex">
            <input type="hidden" name="role" value={role} />
            <Button
              type="submit"
              variant="outline"
              className="h-auto w-full flex-row items-start gap-4 whitespace-normal rounded-xl p-5 text-left lg:flex-col lg:gap-3"
            >
              <Icon />
              <span className="text-base font-semibold">{title}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {description}
              </span>
            </Button>
          </form>
        ))}
      </div>
    </main>
  )
}
