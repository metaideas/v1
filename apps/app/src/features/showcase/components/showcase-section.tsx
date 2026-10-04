import type { ReactNode } from "react"
import { SHOWCASE_GROUPS, type ShowcaseSectionId } from "#features/showcase/constants.ts"

const SECTION_TITLES = new Map<string, string>(
  SHOWCASE_GROUPS.flatMap((group) => group.sections.map((section) => [section.id, section.title]))
)

export default function ShowcaseSection({
  children,
  description,
  id,
}: Readonly<{ children: ReactNode; description?: string; id: ShowcaseSectionId }>) {
  const title = SECTION_TITLES.get(id) ?? id
  const headingId = `${id}-heading`

  return (
    <section aria-labelledby={headingId} className="scroll-mt-24" id={id}>
      <div className="mb-4 flex flex-col gap-1">
        <h3
          className="group flex items-center gap-2 text-xl font-semibold tracking-tight"
          id={headingId}
        >
          {title}
          <a
            aria-label={`Link to ${title}`}
            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            href={`#${id}`}
          >
            #
          </a>
        </h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-6 rounded-xl border bg-card/40 p-4 sm:p-6">{children}</div>
    </section>
  )
}
