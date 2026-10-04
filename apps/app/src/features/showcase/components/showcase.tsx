import type { ComponentType } from "react"
import { ThemeToggle } from "@v1/ui/components/theme"
import ShowcaseActions from "#features/showcase/components/showcase-actions.tsx"
import ShowcaseConversation from "#features/showcase/components/showcase-conversation.tsx"
import ShowcaseData from "#features/showcase/components/showcase-data.tsx"
import ShowcaseFeedback from "#features/showcase/components/showcase-feedback.tsx"
import ShowcaseForms from "#features/showcase/components/showcase-forms.tsx"
import ShowcaseLayout from "#features/showcase/components/showcase-layout.tsx"
import ShowcaseNavigation from "#features/showcase/components/showcase-navigation.tsx"
import ShowcaseOverlays from "#features/showcase/components/showcase-overlays.tsx"
import ShowcaseProviders from "#features/showcase/components/showcase-providers.tsx"
import { SHOWCASE_GROUPS, type ShowcaseGroupId } from "#features/showcase/constants.ts"

const GROUP_SECTIONS: Record<ShowcaseGroupId, ComponentType> = {
  actions: ShowcaseActions,
  conversation: ShowcaseConversation,
  data: ShowcaseData,
  feedback: ShowcaseFeedback,
  forms: ShowcaseForms,
  layout: ShowcaseLayout,
  navigation: ShowcaseNavigation,
  overlays: ShowcaseOverlays,
  providers: ShowcaseProviders,
}

export default function Showcase() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a className="flex items-baseline gap-2" href="#top">
            <span className="text-base font-semibold tracking-tight">Showcase</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Every @v1/ui component in every state
            </span>
          </a>
          <ThemeToggle />
        </div>
      </header>

      <div
        className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12"
        id="top"
      >
        <nav
          aria-label="Components"
          className="lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:self-start lg:overflow-y-auto"
        >
          <ul className="flex flex-col gap-4">
            {SHOWCASE_GROUPS.map((group) => (
              <li key={group.id}>
                <a
                  className="text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
                  href={`#${group.id}`}
                >
                  {group.title}
                </a>
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 lg:flex-col lg:gap-1">
                  {group.sections.map((section) => (
                    <li key={section.id}>
                      <a
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
                        href={`#${section.id}`}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex min-w-0 flex-col gap-16">
          {SHOWCASE_GROUPS.map((group) => {
            const GroupSections = GROUP_SECTIONS[group.id]

            return (
              <section
                aria-labelledby={`${group.id}-heading`}
                className="flex scroll-mt-20 flex-col gap-12"
                id={group.id}
                key={group.id}
              >
                <h2
                  className="border-b pb-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                  id={`${group.id}-heading`}
                >
                  {group.title}
                </h2>
                <GroupSections />
              </section>
            )
          })}
        </main>
      </div>
    </div>
  )
}
