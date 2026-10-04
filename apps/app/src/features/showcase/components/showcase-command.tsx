import { Button } from "@v1/ui/components/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@v1/ui/components/command"
import { Icon } from "@v1/ui/components/icon"
import ShowcaseDemo from "#features/showcase/components/showcase-demo.tsx"
import { useHasBeenInView, useOpenState } from "#features/showcase/hooks.ts"

function CommandItems() {
  return (
    <>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <Icon.Home />
            Home
          </CommandItem>
          <CommandItem>
            <Icon.Search />
            Search
          </CommandItem>
          <CommandItem disabled>
            <Icon.Bot />
            Assistant (disabled)
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <Icon.Sun />
            Light theme
            <CommandShortcut>⌘L</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon.Moon />
            Dark theme
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon.Languages />
            Language
            <CommandShortcut>⌘J</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </>
  )
}

function InlineCommandDemo() {
  const { hasBeenInView, ref } = useHasBeenInView<HTMLDivElement>()

  return (
    <div className="min-h-80 w-full max-w-md" ref={ref}>
      {hasBeenInView ? (
        <Command className="rounded-lg border">
          <CommandItems />
        </Command>
      ) : null}
    </div>
  )
}

function CommandDialogDemo() {
  const { isOpen, setIsOpen } = useOpenState()

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true)
        }}
        variant="outline"
      >
        <Icon.Search data-icon="inline-start" />
        Open command palette
      </Button>
      <CommandDialog onOpenChange={setIsOpen} open={isOpen}>
        <Command>
          <CommandItems />
        </Command>
      </CommandDialog>
    </>
  )
}

export default function ShowcaseCommand() {
  return (
    <>
      <ShowcaseDemo className="grid grid-cols-1" label="Inline">
        <InlineCommandDemo />
      </ShowcaseDemo>
      <ShowcaseDemo label="Dialog">
        <CommandDialogDemo />
      </ShowcaseDemo>
    </>
  )
}
