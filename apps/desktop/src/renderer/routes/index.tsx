import { createFileRoute, Link } from "@tanstack/react-router"
import { ThemeToggle } from "@v1/ui/components/theme"
import LocaleToggle from "#shared/components/locale-toggle.tsx"
import { m } from "#shared/internationalization/messages.js"

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">{m.desktop_local_files_title()}</h1>
      <p className="max-w-md text-center text-muted-foreground">
        {m.desktop_local_files_description()}
      </p>
      <Link className="rounded-md bg-primary px-4 py-2 text-primary-foreground" to="/files">
        {m.desktop_local_files_choose()}
      </Link>
      <LocaleToggle />
      <ThemeToggle />
    </main>
  )
}

export const Route = createFileRoute("/")({
  component: Index,
})
