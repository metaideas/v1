import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@v1/ui/components/breadcrumb"
import { Button } from "@v1/ui/components/button"
import { DirectionProvider } from "@v1/ui/components/direction"
import { Field, FieldLabel } from "@v1/ui/components/field"
import { Slider } from "@v1/ui/components/slider"
import { Switch } from "@v1/ui/components/switch"
import { Tabs, TabsList, TabsTrigger } from "@v1/ui/components/tabs"
import { ThemeToggle, useTheme } from "@v1/ui/components/theme"
import { ToggleGroup, ToggleGroupItem } from "@v1/ui/components/toggle-group"
import { THEMES } from "@v1/ui/constants"
import ShowcaseDemo from "#features/showcase/components/showcase-demo.tsx"
import ShowcaseSection from "#features/showcase/components/showcase-section.tsx"
import { TEXT_DIRECTIONS } from "#features/showcase/constants.ts"

function ThemeControls() {
  const { setTheme, theme } = useTheme()

  return (
    <>
      <ShowcaseDemo label="Theme toggle">
        <ThemeToggle />
        <p className="text-sm text-muted-foreground">
          Current theme: <span className="font-medium text-foreground">{theme}</span>
        </p>
      </ShowcaseDemo>
      <ShowcaseDemo label="Set the theme directly">
        <ToggleGroup aria-label="Theme" spacing={0} value={[theme]} variant="outline">
          {THEMES.map((value) => (
            <ToggleGroupItem
              className="capitalize"
              key={value}
              onClick={() => {
                setTheme(value)
              }}
              value={value}
            >
              {value}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          onClick={() => {
            setTheme(theme === "dark" ? "light" : "dark")
          }}
          variant="secondary"
        >
          Flip light and dark
        </Button>
      </ShowcaseDemo>
    </>
  )
}

export default function ShowcaseProviders() {
  return (
    <>
      <ShowcaseSection
        description="The app-wide ThemeProvider persists the theme. Every component on this page follows it."
        id="theme"
      >
        <ThemeControls />
      </ShowcaseSection>

      <ShowcaseSection
        description="DirectionProvider tells Base UI components which way to lay out and navigate with the keyboard."
        id="direction"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {TEXT_DIRECTIONS.map((direction) => (
            <DirectionProvider direction={direction.value} key={direction.value}>
              <div className="flex flex-col gap-4 rounded-lg border p-4" dir={direction.value}>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {direction.label}
                </p>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="#direction">{direction.home}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{direction.page}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <Tabs defaultValue="first">
                  <TabsList>
                    <TabsTrigger value="first">{direction.tabs[0]}</TabsTrigger>
                    <TabsTrigger value="second">{direction.tabs[1]}</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Slider aria-label={direction.label} defaultValue={[30]} />
                <Field orientation="horizontal">
                  <Switch defaultChecked id={`showcase-direction-${direction.value}`} />
                  <FieldLabel htmlFor={`showcase-direction-${direction.value}`}>
                    {direction.toggle}
                  </FieldLabel>
                </Field>
              </div>
            </DirectionProvider>
          ))}
        </div>
      </ShowcaseSection>
    </>
  )
}
