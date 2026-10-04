import { createFileRoute } from "@tanstack/react-router"
import { Avatar, AvatarFallback, AvatarImage } from "@v1/ui/components/avatar"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@v1/ui/components/empty"
import { Icon } from "@v1/ui/components/icon"
import { ThemeToggle } from "@v1/ui/components/theme"
import SignOutButton from "#features/auth/components/sign-out-button.tsx"
import LocaleToggle from "#shared/components/locale-toggle.tsx"

function RouteComponent() {
  const { user } = Route.useLoaderData()

  return (
    <div className="flex h-svh min-h-0 flex-col bg-muted/30">
      <header className="shrink-0 border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar>
              <AvatarImage alt="" src={user.image ?? undefined} />
              <AvatarFallback>{user.name[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="hidden truncate text-xs text-muted-foreground sm:block">
                {user.email}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 justify-center p-4 sm:p-6">
        <Empty className="border border-dashed bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon.Home />
            </EmptyMedia>
            <EmptyTitle>Welcome, {user.name}</EmptyTitle>
            <EmptyDescription>
              You are signed in. Build your product here, starting in{" "}
              <code>src/routes/_authenticated/index.tsx</code>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    </div>
  )
}

export const Route = createFileRoute("/_authenticated/")({
  component: RouteComponent,
  loader: ({ context }) => ({ user: context.session.user }),
})
