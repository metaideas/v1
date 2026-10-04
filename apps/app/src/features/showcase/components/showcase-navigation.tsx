import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@v1/ui/components/breadcrumb"
import { Card, CardDescription, CardHeader, CardTitle } from "@v1/ui/components/card"
import { Icon } from "@v1/ui/components/icon"
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@v1/ui/components/menubar"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@v1/ui/components/navigation-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@v1/ui/components/pagination"
import { Separator } from "@v1/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@v1/ui/components/sidebar"
import { Skeleton } from "@v1/ui/components/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/ui/components/tabs"
import ShowcaseDemo from "#features/showcase/components/showcase-demo.tsx"
import ShowcaseSection from "#features/showcase/components/showcase-section.tsx"
import { NAVIGATION_LINKS, SIDEBAR_ITEMS, SIDEBAR_PROJECTS } from "#features/showcase/constants.ts"

function SidebarItemIcon({ name }: Readonly<{ name: keyof typeof Icon }>) {
  const ItemIcon = Icon[name]

  return <ItemIcon />
}

export default function ShowcaseNavigation() {
  return (
    <>
      <ShowcaseSection id="breadcrumb">
        <ShowcaseDemo label="Default">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#breadcrumb">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#breadcrumb">Components</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </ShowcaseDemo>
        <ShowcaseDemo label="Collapsed with custom separator">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#breadcrumb">
                  <Icon.Home className="size-4" />
                  <span className="sr-only">Home</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbEllipsis />
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href="#breadcrumb">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Notifications</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="pagination">
        <ShowcaseDemo label="With ellipsis and active page">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#pagination" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#pagination">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#pagination" isActive>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#pagination">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#pagination">10</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#pagination" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </ShowcaseDemo>
        <ShowcaseDemo label="Compact with custom labels">
          <Pagination className="justify-start">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#pagination" text="Newer" />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#pagination" text="Older" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="tabs">
        <ShowcaseDemo className="grid max-w-md grid-cols-1" label="Default">
          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger disabled value="billing">
                Billing
              </TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                  <CardDescription>Make changes to your account here.</CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>
            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Change your password here.</CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>
          </Tabs>
        </ShowcaseDemo>
        <ShowcaseDemo label="Line variant with icons">
          <Tabs defaultValue="overview">
            <TabsList variant="line">
              <TabsTrigger value="overview">
                <Icon.Home />
                Overview
              </TabsTrigger>
              <TabsTrigger value="search">
                <Icon.Search />
                Search
              </TabsTrigger>
              <TabsTrigger value="info">
                <Icon.Info />
                Info
              </TabsTrigger>
            </TabsList>
            <TabsContent className="text-muted-foreground" value="overview">
              Overview content.
            </TabsContent>
            <TabsContent className="text-muted-foreground" value="search">
              Search content.
            </TabsContent>
            <TabsContent className="text-muted-foreground" value="info">
              Info content.
            </TabsContent>
          </Tabs>
        </ShowcaseDemo>
        <ShowcaseDemo label="Vertical">
          <Tabs defaultValue="general" orientation="vertical">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>
            <TabsContent className="p-2 text-muted-foreground" value="general">
              General settings.
            </TabsContent>
            <TabsContent className="p-2 text-muted-foreground" value="security">
              Security settings.
            </TabsContent>
            <TabsContent className="p-2 text-muted-foreground" value="integrations">
              Integration settings.
            </TabsContent>
          </Tabs>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="navigation-menu">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-72 grid-cols-1 gap-1 p-1 sm:w-96 sm:grid-cols-2">
                  {NAVIGATION_LINKS.map((link) => (
                    <li key={link.title}>
                      <NavigationMenuLink href="#navigation-menu">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{link.title}</span>
                          <span className="text-muted-foreground">{link.description}</span>
                        </div>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-56 grid-cols-1 gap-1 p-1">
                  <li>
                    <NavigationMenuLink href="#navigation-menu">Blog</NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#navigation-menu">Changelog</NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#navigation-menu">
                Docs
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </ShowcaseSection>

      <ShowcaseSection id="menubar">
        <Menubar className="w-fit">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                New tab
                <MenubarShortcut>⌘T</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                New window
                <MenubarShortcut>⌘N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem disabled>New incognito window</MenubarItem>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>Share</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Email link</MenubarItem>
                  <MenubarItem>Messages</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSeparator />
              <MenubarItem variant="destructive">Close window</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem defaultChecked>Always show bookmarks</MenubarCheckboxItem>
              <MenubarCheckboxItem>Always show full URLs</MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarItem inset>Reload</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Profiles</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarLabel inset>Switch profile</MenubarLabel>
                <MenubarRadioGroup defaultValue="ada">
                  <MenubarRadioItem value="ada">Ada</MenubarRadioItem>
                  <MenubarRadioItem value="grace">Grace</MenubarRadioItem>
                  <MenubarRadioItem value="linus">Linus</MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </ShowcaseSection>

      <ShowcaseSection
        description="A contained SidebarProvider. Collapse it with the trigger, the rail, or Cmd/Ctrl + B. On small screens the sidebar opens as a sheet."
        id="sidebar"
      >
        <SidebarProvider className="relative h-[34rem] min-h-0 overflow-hidden rounded-lg border">
          <Sidebar className="absolute h-full" collapsible="icon">
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <Icon.Square className="size-4" />
                    </div>
                    <div className="grid flex-1 grid-cols-1 text-left leading-tight">
                      <span className="truncate font-medium">Acme Inc</span>
                      <span className="truncate text-xs text-muted-foreground">Enterprise</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <SidebarInput aria-label="Search the docs" placeholder="Search..." />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Platform</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {SIDEBAR_ITEMS.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          isActive={item.isActive}
                          render={<a aria-label={item.title} href="#sidebar" />}
                          tooltip={item.title}
                        >
                          <SidebarItemIcon name={item.icon} />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                        {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                      </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Settings">
                        <Icon.Info />
                        <span>Settings</span>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton href="#sidebar" isActive>
                            <span>General</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton href="#sidebar">
                            <span>Team</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Projects</SidebarGroupLabel>
                <SidebarGroupAction title="Add project">
                  <Icon.Plus />
                  <span className="sr-only">Add project</span>
                </SidebarGroupAction>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {SIDEBAR_PROJECTS.map((project) => (
                      <SidebarMenuItem key={project}>
                        <SidebarMenuButton tooltip={project}>
                          <Icon.Circle />
                          <span>{project}</span>
                        </SidebarMenuButton>
                        <SidebarMenuAction showOnHover>
                          <Icon.DotsHorizontal />
                          <span className="sr-only">More</span>
                        </SidebarMenuAction>
                      </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                      <SidebarMenuSkeleton showIcon />
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Jane Doe">
                    <Icon.Bot />
                    <span>Jane Doe</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- SidebarInset renders a main element, and the page already has one, so the demo exposes it as a region. */}
          <SidebarInset aria-label="Sidebar demo content" role="region">
            <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
              <SidebarTrigger />
              <Separator className="h-4" orientation="vertical" />
              <span className="text-sm font-medium">Dashboard</span>
            </div>
            <div className="grid flex-1 auto-rows-min grid-cols-1 gap-4 p-4 sm:grid-cols-3">
              <Skeleton className="aspect-video rounded-lg" />
              <Skeleton className="aspect-video rounded-lg" />
              <Skeleton className="aspect-video rounded-lg" />
              <Skeleton className="h-32 rounded-lg sm:col-span-3" />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ShowcaseSection>
    </>
  )
}
