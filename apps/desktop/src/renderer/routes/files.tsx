import { createFileRoute, Link } from "@tanstack/react-router"
import FileEditor from "#features/local-files/components/file-editor.tsx"
import LocaleToggle from "#shared/components/locale-toggle.tsx"

function FilesRoute() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-6">
      <div className="flex w-full max-w-3xl items-center justify-between gap-4">
        <Link className="text-sm underline underline-offset-4" to="/">
          Home
        </Link>
        <LocaleToggle />
      </div>
      <FileEditor />
    </main>
  )
}

export const Route = createFileRoute("/files")({
  component: FilesRoute,
})
