import { ClientOnly } from "@tanstack/react-router"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@v1/ui/components/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@v1/ui/components/avatar"
import { Button } from "@v1/ui/components/button"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@v1/ui/components/context-menu"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@v1/ui/components/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@v1/ui/components/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@v1/ui/components/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@v1/ui/components/field"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@v1/ui/components/hover-card"
import { Icon } from "@v1/ui/components/icon"
import { Input } from "@v1/ui/components/input"
import { Kbd, KbdGroup } from "@v1/ui/components/kbd"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@v1/ui/components/popover"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@v1/ui/components/sheet"
import { toast } from "@v1/ui/components/toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@v1/ui/components/tooltip"
import { lazy, Suspense } from "react"
import ShowcaseDemo from "#features/showcase/components/showcase-demo.tsx"
import ShowcaseSection from "#features/showcase/components/showcase-section.tsx"
import { AVATAR_IMAGE_SRC, SIDES, TERMS_PARAGRAPHS } from "#features/showcase/constants.ts"
import { useOpenState } from "#features/showcase/hooks.ts"

const ShowcaseCommand = lazy(() => import("#features/showcase/components/showcase-command.tsx"))

function DestructiveAlertDialog() {
  const { isOpen, setIsOpen } = useOpenState()

  return (
    <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete project
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Icon.TriangleAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete project?</AlertDialogTitle>
          <AlertDialogDescription>
            All of its data will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setIsOpen(false)
              toast.add({ title: "Project deleted", type: "success" })
            }}
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function ShowcaseOverlays() {
  return (
    <>
      <ShowcaseSection id="dialog">
        <ShowcaseDemo label="Variants">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Edit profile</DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here. Click save when you are done.
                </DialogDescription>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="showcase-dialog-name">Name</FieldLabel>
                  <Input defaultValue="Jane Doe" id="showcase-dialog-name" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="showcase-dialog-username">Username</FieldLabel>
                  <Input defaultValue="@janedoe" id="showcase-dialog-username" />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <DialogClose render={<Button />}>Save changes</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Footer close button</DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Share link</DialogTitle>
                <DialogDescription>Anyone with this link can view the document.</DialogDescription>
              </DialogHeader>
              <Input aria-label="Share link" defaultValue="https://example.com/doc/123" readOnly />
              <DialogFooter showCloseButton />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Scrollable content</DialogTrigger>
            <DialogContent className="max-h-[80svh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Terms of service</DialogTitle>
                <DialogDescription>Long content scrolls inside the dialog.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 text-sm text-muted-foreground">
                {TERMS_PARAGRAPHS.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="alert-dialog">
        <ShowcaseDemo label="Variants">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              Show dialog
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogCancel variant="default">Continue</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DestructiveAlertDialog />
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="sheet">
        <ShowcaseDemo label="Sides">
          {SIDES.map((side) => (
            <Sheet key={side}>
              <SheetTrigger render={<Button className="capitalize" variant="outline" />}>
                {side}
              </SheetTrigger>
              <SheetContent side={side}>
                <SheetHeader>
                  <SheetTitle>Edit profile</SheetTitle>
                  <SheetDescription>This sheet slides in from the {side}.</SheetDescription>
                </SheetHeader>
                <div className="px-4">
                  <Field>
                    <FieldLabel htmlFor={`showcase-sheet-${side}`}>Name</FieldLabel>
                    <Input defaultValue="Jane Doe" id={`showcase-sheet-${side}`} />
                  </Field>
                </div>
                <SheetFooter>
                  <SheetClose render={<Button />}>Save changes</SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ))}
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="drawer">
        <ShowcaseDemo label="Swipe directions">
          <Drawer showSwipeHandle>
            <DrawerTrigger render={<Button variant="outline" />}>Bottom drawer</DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Move goal</DrawerTitle>
                <DrawerDescription>Set your daily activity goal.</DrawerDescription>
              </DrawerHeader>
              <div className="flex items-center justify-center gap-6 p-4 text-5xl font-bold tabular-nums">
                350
              </div>
              <DrawerFooter>
                <DrawerClose render={<Button />}>Submit</DrawerClose>
                <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          <Drawer swipeDirection="right">
            <DrawerTrigger render={<Button variant="outline" />}>Right drawer</DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Filters</DrawerTitle>
                <DrawerDescription>Swipe right to dismiss.</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="popover">
        <ShowcaseDemo label="With form">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>Dimensions</PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Dimensions</PopoverTitle>
                <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
              </PopoverHeader>
              <FieldGroup className="gap-3">
                <Field orientation="horizontal">
                  <FieldLabel className="w-20" htmlFor="showcase-popover-width">
                    Width
                  </FieldLabel>
                  <Input defaultValue="100%" id="showcase-popover-width" />
                </Field>
                <Field orientation="horizontal">
                  <FieldLabel className="w-20" htmlFor="showcase-popover-height">
                    Height
                  </FieldLabel>
                  <Input defaultValue="25px" id="showcase-popover-height" />
                </Field>
              </FieldGroup>
            </PopoverContent>
          </Popover>
        </ShowcaseDemo>
        <ShowcaseDemo label="Sides">
          {SIDES.map((side) => (
            <Popover key={side}>
              <PopoverTrigger render={<Button className="capitalize" variant="outline" />}>
                {side}
              </PopoverTrigger>
              <PopoverContent className="w-56" side={side}>
                <PopoverHeader>
                  <PopoverTitle className="capitalize">{side}</PopoverTitle>
                  <PopoverDescription>Positioned on the {side} side.</PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
          ))}
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="hover-card">
        <ShowcaseDemo label="Profile preview">
          <HoverCard>
            <HoverCardTrigger
              className="text-sm font-medium underline underline-offset-4"
              href="#hover-card"
            >
              @v1
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="flex gap-4">
                <Avatar>
                  <AvatarImage alt="v1" src={AVATAR_IMAGE_SRC} />
                  <AvatarFallback>IN</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">@v1</p>
                  <p className="text-sm">A modern, opinionated monorepo template for TypeScript.</p>
                  <p className="text-xs text-muted-foreground">Joined December 2023</p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="tooltip">
        <ShowcaseDemo label="Sides">
          {SIDES.map((side) => (
            <Tooltip key={side}>
              <TooltipTrigger render={<Button className="capitalize" variant="outline" />}>
                {side}
              </TooltipTrigger>
              <TooltipContent side={side}>Tooltip on the {side}</TooltipContent>
            </Tooltip>
          ))}
        </ShowcaseDemo>
        <ShowcaseDemo label="With keyboard shortcut and icon button">
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" />}>Save</TooltipTrigger>
            <TooltipContent>
              Save changes
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>S</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button aria-label="Add item" size="icon" variant="outline" />}>
              <Icon.Plus />
            </TooltipTrigger>
            <TooltipContent>Add item</TooltipContent>
          </Tooltip>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="dropdown-menu">
        <ShowcaseDemo label="Full menu">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              Open menu
              <Icon.ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>My account</DropdownMenuLabel>
                <DropdownMenuItem>
                  Profile
                  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Settings
                  <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Billing (disabled)</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                <DropdownMenuCheckboxItem defaultChecked>Status bar</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Activity bar</DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Panel position</DropdownMenuLabel>
                <DropdownMenuRadioGroup defaultValue="bottom">
                  <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Email</DropdownMenuItem>
                  <DropdownMenuItem>Message</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem inset>Inset item</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                Delete account
                <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button aria-label="More actions" size="icon" variant="ghost" />}
            >
              <Icon.DotsHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Rename</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="context-menu">
        <ContextMenu>
          <ContextMenuTrigger className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Right-click or long-press here
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56">
            <ContextMenuItem>
              Back
              <ContextMenuShortcut>⌘[</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem disabled>
              Forward
              <ContextMenuShortcut>⌘]</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Reload
              <ContextMenuShortcut>⌘R</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Save page as...</ContextMenuItem>
                <ContextMenuItem>Developer tools</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem defaultChecked>Show bookmarks</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem>Show full URLs</ContextMenuCheckboxItem>
            <ContextMenuSeparator />
            <ContextMenuGroup>
              <ContextMenuLabel inset>People</ContextMenuLabel>
              <ContextMenuRadioGroup defaultValue="ada">
                <ContextMenuRadioItem value="ada">Ada Lovelace</ContextMenuRadioItem>
                <ContextMenuRadioItem value="grace">Grace Hopper</ContextMenuRadioItem>
              </ContextMenuRadioGroup>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </ShowcaseSection>

      <ShowcaseSection id="command">
        <ClientOnly>
          <Suspense>
            <ShowcaseCommand />
          </Suspense>
        </ClientOnly>
      </ShowcaseSection>
    </>
  )
}
