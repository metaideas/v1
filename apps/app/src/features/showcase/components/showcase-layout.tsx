import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@v1/ui/components/accordion"
import { AspectRatio } from "@v1/ui/components/aspect-ratio"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@v1/ui/components/avatar"
import { Badge } from "@v1/ui/components/badge"
import { Button } from "@v1/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@v1/ui/components/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@v1/ui/components/carousel"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@v1/ui/components/collapsible"
import { Icon } from "@v1/ui/components/icon"
import { Input } from "@v1/ui/components/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@v1/ui/components/item"
import { Label } from "@v1/ui/components/label"
import { Marker, MarkerContent, MarkerIcon } from "@v1/ui/components/marker"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@v1/ui/components/resizable"
import { ScrollArea, ScrollBar } from "@v1/ui/components/scroll-area"
import { Separator } from "@v1/ui/components/separator"
import { Typography } from "@v1/ui/components/typography"
import ShowcaseDemo from "#features/showcase/components/showcase-demo.tsx"
import ShowcaseSection from "#features/showcase/components/showcase-section.tsx"
import {
  ASPECT_RATIOS,
  AVATAR_IMAGE_SRC,
  CAROUSEL_SLIDES,
  SCROLL_AREA_TAGS,
} from "#features/showcase/constants.ts"

export default function ShowcaseLayout() {
  return (
    <>
      <ShowcaseSection id="accordion">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1" label="Single, one open by default">
            <Accordion defaultValue={["shipping"]}>
              <AccordionItem value="shipping">
                <AccordionTrigger>What are your shipping options?</AccordionTrigger>
                <AccordionContent>
                  We offer standard (5-7 days), express (2-3 days), and overnight shipping.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="returns">
                <AccordionTrigger>What is your return policy?</AccordionTrigger>
                <AccordionContent>
                  Returns are accepted within 30 days of purchase.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem disabled value="disabled">
                <AccordionTrigger>Disabled item</AccordionTrigger>
                <AccordionContent>You cannot open this.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Multiple">
            <Accordion defaultValue={["one", "two"]} multiple>
              <AccordionItem value="one">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>Yes. It follows the WAI-ARIA design pattern.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="two">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>Yes. It matches the other components.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="three">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>Yes. Panels animate their height.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </ShowcaseDemo>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="collapsible">
        <Collapsible className="flex w-full max-w-sm flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold">@v1 starred 3 repositories</span>
            <CollapsibleTrigger render={<Button size="icon-sm" variant="ghost" />}>
              <Icon.ChevronDown />
              <span className="sr-only">Toggle repositories</span>
            </CollapsibleTrigger>
          </div>
          <div className="rounded-md border px-4 py-2 font-mono text-sm">@base-ui/react</div>
          <CollapsibleContent className="flex flex-col gap-2">
            <div className="rounded-md border px-4 py-2 font-mono text-sm">
              @tanstack/react-start
            </div>
            <div className="rounded-md border px-4 py-2 font-mono text-sm">tailwindcss</div>
          </CollapsibleContent>
        </Collapsible>
      </ShowcaseSection>

      <ShowcaseSection id="card">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Enter your email below to sign in.</CardDescription>
              <CardAction>
                <Button size="sm" variant="link">
                  Sign up
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Label htmlFor="showcase-card-email">Email</Label>
              <Input id="showcase-card-email" placeholder="you@example.com" type="email" />
            </CardContent>
            <CardFooter className="flex-col gap-2 border-t">
              <Button className="w-full">Sign in</Button>
              <Button className="w-full" variant="outline">
                Continue with Google
              </Button>
            </CardFooter>
          </Card>
          <div className="flex flex-col gap-6">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Small card</CardTitle>
                <CardDescription>Uses tighter spacing.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Cards size their padding with a shared spacing variable.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total revenue</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">$15,231.89</CardTitle>
                <CardAction>
                  <Badge variant="outline">+20.1%</Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="text-muted-foreground">Compared to last month</CardFooter>
            </Card>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="item">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1 gap-3" label="Variants">
            <Item variant="default">
              <ItemContent>
                <ItemTitle>Default item</ItemTitle>
                <ItemDescription>A transparent row for lists.</ItemDescription>
              </ItemContent>
            </Item>
            <Item variant="outline">
              <ItemMedia variant="icon">
                <Icon.Info />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Outline item</ItemTitle>
                <ItemDescription>With an icon and an action.</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </ItemActions>
            </Item>
            <Item variant="muted">
              <ItemMedia variant="image">
                <div className="size-full bg-linear-to-br from-indigo-500 to-pink-500" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Muted item</ItemTitle>
                <ItemDescription>With image media.</ItemDescription>
              </ItemContent>
            </Item>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-3" label="Sizes, link, header, and footer">
            <Item size="sm" variant="outline">
              <ItemContent>
                <ItemTitle>Small item</ItemTitle>
              </ItemContent>
              <ItemActions>
                <Icon.ChevronRight className="size-4" />
              </ItemActions>
            </Item>
            <Item size="xs" variant="outline">
              <ItemContent>
                <ItemTitle>Extra small item</ItemTitle>
              </ItemContent>
            </Item>
            <Item render={<a aria-label="Rendered as a link" href="#item" />} variant="outline">
              <ItemContent>
                <ItemTitle>Rendered as a link</ItemTitle>
                <ItemDescription>The whole row is clickable.</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Icon.ArrowRight className="size-4" />
              </ItemActions>
            </Item>
            <Item variant="outline">
              <ItemHeader>
                <ItemTitle>Deployment</ItemTitle>
                <Badge variant="secondary">Ready</Badge>
              </ItemHeader>
              <ItemFooter>
                <ItemDescription>main · 2 minutes ago</ItemDescription>
              </ItemFooter>
            </Item>
          </ShowcaseDemo>
        </div>
        <ShowcaseDemo className="grid max-w-md grid-cols-1" label="Group with separators">
          <ItemGroup className="rounded-lg border">
            <Item>
              <ItemMedia>
                <Avatar>
                  <AvatarFallback>AL</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Ada Lovelace</ItemTitle>
                <ItemDescription>ada@example.com</ItemDescription>
              </ItemContent>
            </Item>
            <ItemSeparator />
            <Item>
              <ItemMedia>
                <Avatar>
                  <AvatarFallback>GH</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Grace Hopper</ItemTitle>
                <ItemDescription>grace@example.com</ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="aspect-ratio">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {ASPECT_RATIOS.map((ratio) => (
            <ShowcaseDemo className="grid grid-cols-1" key={ratio.label} label={ratio.label}>
              <AspectRatio
                className="flex items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-muted to-muted-foreground/30 text-sm text-muted-foreground"
                ratio={ratio.value}
              >
                {ratio.label}
              </AspectRatio>
            </ShowcaseDemo>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="separator">
        <div className="max-w-sm">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-medium">Base UI primitives</h4>
            <p className="text-sm text-muted-foreground">An open-source UI component library.</p>
          </div>
          <Separator className="my-4" />
          <div className="flex h-5 items-center gap-4 text-sm">
            <span>Blog</span>
            <Separator orientation="vertical" />
            <span>Docs</span>
            <Separator orientation="vertical" />
            <span>Source</span>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="scroll-area">
        <div className="flex flex-wrap gap-6">
          <ShowcaseDemo label="Vertical">
            <ScrollArea className="h-72 w-48 rounded-md border">
              <div className="p-4">
                <h4 className="mb-4 text-sm font-medium">Tags</h4>
                {SCROLL_AREA_TAGS.map((tag) => (
                  <div className="border-b py-2 text-sm last:border-0" key={tag}>
                    {tag}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid min-w-0 flex-1 grid-cols-1" label="Horizontal">
            <ScrollArea className="w-full max-w-md rounded-md border whitespace-nowrap">
              <div className="flex w-max gap-4 p-4">
                {CAROUSEL_SLIDES.map((slide) => (
                  <div
                    className="flex h-32 w-48 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium"
                    key={slide}
                  >
                    Artwork {slide}
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </ShowcaseDemo>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="resizable">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1" label="Horizontal with nested vertical group">
            <ResizablePanelGroup className="min-h-56 rounded-lg border" orientation="horizontal">
              <ResizablePanel defaultSize="50%">
                <div className="flex h-full items-center justify-center p-6 text-sm">One</div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize="50%">
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel defaultSize="40%">
                    <div className="flex h-full items-center justify-center p-6 text-sm">Two</div>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize="60%">
                    <div className="flex h-full items-center justify-center p-6 text-sm">Three</div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="With handle">
            <ResizablePanelGroup className="min-h-56 rounded-lg border" orientation="horizontal">
              <ResizablePanel defaultSize="30%" minSize="20%">
                <div className="flex h-full items-center justify-center p-6 text-sm">Sidebar</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="70%">
                <div className="flex h-full items-center justify-center p-6 text-sm">Content</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ShowcaseDemo>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="carousel">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1 px-12" label="Single slide">
            <Carousel className="w-full">
              <CarouselContent>
                {CAROUSEL_SLIDES.map((slide) => (
                  <CarouselItem key={slide}>
                    <Card>
                      <CardContent className="flex aspect-square items-center justify-center">
                        <span className="text-4xl font-semibold">{slide}</span>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 px-12" label="Multiple slides, looping">
            <Carousel className="w-full" opts={{ align: "start", loop: true }}>
              <CarouselContent>
                {CAROUSEL_SLIDES.map((slide) => (
                  <CarouselItem className="basis-1/2 lg:basis-1/3" key={slide}>
                    <Card size="sm">
                      <CardContent className="flex aspect-square items-center justify-center">
                        <span className="text-2xl font-semibold">{slide}</span>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </ShowcaseDemo>
        </div>
        <ShowcaseDemo className="justify-center py-12" label="Vertical">
          <Carousel className="w-full max-w-xs" opts={{ align: "start" }} orientation="vertical">
            <CarouselContent className="h-48">
              {CAROUSEL_SLIDES.map((slide) => (
                <CarouselItem className="basis-1/2" key={slide}>
                  <Card size="sm">
                    <CardContent className="flex items-center justify-center py-4">
                      <span className="text-2xl font-semibold">{slide}</span>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="avatar">
        <ShowcaseDemo label="Sizes, image, and fallback">
          <Avatar size="sm">
            <AvatarImage alt="Gradient avatar" src={AVATAR_IMAGE_SRC} />
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage alt="Gradient avatar" src={AVATAR_IMAGE_SRC} />
            <AvatarFallback>MD</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage alt="Gradient avatar" src={AVATAR_IMAGE_SRC} />
            <AvatarFallback>LG</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </ShowcaseDemo>
        <ShowcaseDemo label="Badges">
          <Avatar size="sm">
            <AvatarFallback>AL</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <Avatar>
            <AvatarFallback>GH</AvatarFallback>
            <AvatarBadge className="bg-green-600 dark:bg-green-500" />
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>LT</AvatarFallback>
            <AvatarBadge>
              <Icon.Check />
            </AvatarBadge>
          </Avatar>
        </ShowcaseDemo>
        <ShowcaseDemo label="Groups">
          <AvatarGroup>
            <Avatar>
              <AvatarImage alt="Gradient avatar" src={AVATAR_IMAGE_SRC} />
              <AvatarFallback>AL</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>GH</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>LT</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
          <AvatarGroup>
            <Avatar size="lg">
              <AvatarFallback>AL</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>GH</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>
              <Icon.Plus />
            </AvatarGroupCount>
          </AvatarGroup>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="marker">
        <div className="grid max-w-md grid-cols-1 gap-6">
          <Marker>
            <MarkerIcon>
              <Icon.Info />
            </MarkerIcon>
            <MarkerContent>Default marker with an icon.</MarkerContent>
          </Marker>
          <Marker variant="border">
            <MarkerContent>Border marker separates a block of content.</MarkerContent>
          </Marker>
          <Marker variant="separator">
            <MarkerContent>Today</MarkerContent>
          </Marker>
          <Marker>
            <MarkerIcon>
              <Icon.CircleCheck />
            </MarkerIcon>
            <MarkerContent>
              Marker content with an <a href="#marker">inline link</a>.
            </MarkerContent>
          </Marker>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="typography">
        <article className="max-w-2xl">
          <Typography.H1>The Joke Tax Chronicles</Typography.H1>
          <Typography.Lead>
            Once upon a time, in a far-off land, there was a very lazy king.
          </Typography.Lead>
          <Typography.H2>The King&apos;s Plan</Typography.H2>
          <Typography.P>
            The king thought long and hard, and finally came up with{" "}
            <a className="font-medium text-primary underline underline-offset-4" href="#typography">
              a brilliant plan
            </a>
            : he would tax the jokes in the kingdom.
          </Typography.P>
          <Typography.Blockquote>
            &quot;After all,&quot; he said, &quot;everyone enjoys a good joke, so it&apos;s only
            fair that they should pay for the privilege.&quot;
          </Typography.Blockquote>
          <Typography.H3>The Joke Tax</Typography.H3>
          <Typography.P>The king&apos;s subjects were not amused. They grumbled:</Typography.P>
          <Typography.List>
            <li>1st level of puns: 5 gold coins</li>
            <li>2nd level of jokes: 10 gold coins</li>
            <li>3rd level of one-liners: 20 gold coins</li>
          </Typography.List>
          <Typography.H4>People stopped telling jokes</Typography.H4>
          <Typography.P>
            Run <Typography.InlineCode>pnpm template doctor</Typography.InlineCode> to verify the
            kingdom.
          </Typography.P>
          <Typography.Table>
            <Typography.TableRoot>
              <Typography.TableHead>
                <Typography.TableRow>
                  <Typography.TableHeaderCell>King&apos;s treasury</Typography.TableHeaderCell>
                  <Typography.TableHeaderCell>People&apos;s happiness</Typography.TableHeaderCell>
                </Typography.TableRow>
              </Typography.TableHead>
              <Typography.TableBody>
                <Typography.TableRow>
                  <Typography.TableCell>Empty</Typography.TableCell>
                  <Typography.TableCell>Overflowing</Typography.TableCell>
                </Typography.TableRow>
                <Typography.TableRow>
                  <Typography.TableCell>Modest</Typography.TableCell>
                  <Typography.TableCell>Satisfied</Typography.TableCell>
                </Typography.TableRow>
                <Typography.TableRow>
                  <Typography.TableCell>Full</Typography.TableCell>
                  <Typography.TableCell>Ecstatic</Typography.TableCell>
                </Typography.TableRow>
              </Typography.TableBody>
            </Typography.TableRoot>
          </Typography.Table>
          <div className="flex flex-col gap-2">
            <Typography.Large>Large text</Typography.Large>
            <Typography.Small>Small text</Typography.Small>
            <Typography.Muted>Muted text for secondary information.</Typography.Muted>
          </div>
        </article>
      </ShowcaseSection>
    </>
  )
}
