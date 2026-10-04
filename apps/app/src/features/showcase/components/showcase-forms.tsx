import { Calendar } from "@v1/ui/components/calendar"
import { Checkbox } from "@v1/ui/components/checkbox"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@v1/ui/components/combobox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@v1/ui/components/field"
import { useForm } from "@v1/ui/components/form"
import { Icon } from "@v1/ui/components/icon"
import { Input } from "@v1/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@v1/ui/components/input-group"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@v1/ui/components/input-otp"
import { Kbd } from "@v1/ui/components/kbd"
import { Label } from "@v1/ui/components/label"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@v1/ui/components/native-select"
import { RadioGroup, RadioGroupItem } from "@v1/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@v1/ui/components/select"
import { Slider } from "@v1/ui/components/slider"
import { Spinner } from "@v1/ui/components/spinner"
import { Switch } from "@v1/ui/components/switch"
import { Textarea } from "@v1/ui/components/textarea"
import { toast } from "@v1/ui/components/toast"
import ShowcaseDemo from "#features/showcase/components/showcase-demo.tsx"
import ShowcaseSection from "#features/showcase/components/showcase-section.tsx"
import {
  CALENDAR_DEFAULT_MONTH,
  FRAMEWORKS,
  TAKEN_EMAIL,
  FRUITS,
  TIMEZONES,
  VEGETABLES,
} from "#features/showcase/constants.ts"
import { useCalendarSelection } from "#features/showcase/hooks.ts"
import { ShowcaseFormSchema } from "#features/showcase/schemas.ts"

function ComboboxChipsDemo() {
  const anchor = useComboboxAnchor()

  return (
    <Combobox defaultValue={["TanStack Start", "Astro"]} items={FRAMEWORKS} multiple>
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(values: string[]) => (
            <>
              {values.map((value) => (
                <ComboboxChip key={value}>{value}</ComboboxChip>
              ))}
              <ComboboxChipsInput aria-label="Frameworks" placeholder="Add framework" />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

function CalendarDemos() {
  const { date, range, setDate, setRange } = useCalendarSelection()

  return (
    <div className="flex flex-wrap items-start gap-6">
      <ShowcaseDemo label="Single date">
        <Calendar
          className="rounded-lg border"
          defaultMonth={CALENDAR_DEFAULT_MONTH}
          mode="single"
          onSelect={setDate}
          selected={date}
        />
      </ShowcaseDemo>
      <ShowcaseDemo label="Range across two months">
        <Calendar
          className="rounded-lg border"
          defaultMonth={CALENDAR_DEFAULT_MONTH}
          mode="range"
          numberOfMonths={2}
          onSelect={setRange}
          selected={range}
        />
      </ShowcaseDemo>
      <ShowcaseDemo label="Dropdown caption and week numbers">
        <Calendar
          captionLayout="dropdown"
          className="rounded-lg border"
          defaultMonth={CALENDAR_DEFAULT_MONTH}
          mode="single"
          showWeekNumber
        />
      </ShowcaseDemo>
      <ShowcaseDemo label="Disabled weekends">
        <Calendar
          className="rounded-lg border"
          defaultMonth={CALENDAR_DEFAULT_MONTH}
          disabled={{ dayOfWeek: [0, 6] }}
          mode="single"
        />
      </ShowcaseDemo>
    </div>
  )
}

function ShowcaseFormDemo() {
  const form = useForm({
    defaultValues: { bio: "", email: "", name: "" },
    onSubmit: ({ formApi, value }) => {
      toast.add({ description: `Thanks, ${value.name}.`, title: "Profile saved", type: "success" })
      formApi.reset()
    },
    validators: {
      onSubmit: ShowcaseFormSchema,
      onSubmitAsync: async ({ value }) => {
        await new Promise((resolve) => {
          setTimeout(resolve, 1200)
        })

        return value.email === TAKEN_EMAIL
          ? { fields: { email: { message: "This email is already registered." } } }
          : undefined
      },
    },
  })

  return (
    <form
      className="max-w-md"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.AppForm>
        <FieldGroup>
          <form.AppField name="name">
            {(field) => (
              <field.Field>
                <field.Label>Name</field.Label>
                <field.Input autoComplete="name" placeholder="Jane Doe" />
                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="email">
            {(field) => (
              <field.Field>
                <field.Label>Email</field.Label>
                <field.Input autoComplete="email" placeholder="you@example.com" type="email" />
                <field.Description>We never share your email.</field.Description>
                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="bio">
            {(field) => (
              <field.Field>
                <field.Label>Bio</field.Label>
                <field.Textarea placeholder="Tell us about yourself" />
                <field.Error errors={field.state.meta.errors} />
              </field.Field>
            )}
          </form.AppField>
          <form.ServerError title="Could not save profile" />
          <form.Submit loadingText="Saving...">Save profile</form.Submit>
        </FieldGroup>
      </form.AppForm>
    </form>
  )
}

export default function ShowcaseForms() {
  return (
    <>
      <ShowcaseSection id="label">
        <ShowcaseDemo className="grid max-w-sm grid-cols-1 gap-2" label="With an input">
          <Label htmlFor="showcase-label-email">Email address</Label>
          <Input id="showcase-label-email" placeholder="you@example.com" type="email" />
        </ShowcaseDemo>
        <ShowcaseDemo label="With controls">
          <div className="flex items-center gap-2">
            <Checkbox id="showcase-label-terms" />
            <Label htmlFor="showcase-label-terms">Accept terms</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox disabled id="showcase-label-disabled" />
            <Label htmlFor="showcase-label-disabled">Disabled peer</Label>
          </div>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="input">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="Default">
            <Label htmlFor="showcase-input-default">Name</Label>
            <Input id="showcase-input-default" placeholder="Jane Doe" />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="With value">
            <Label htmlFor="showcase-input-value">Username</Label>
            <Input defaultValue="janedoe" id="showcase-input-value" />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="Password">
            <Label htmlFor="showcase-input-password">Password</Label>
            <Input defaultValue="secret-password" id="showcase-input-password" type="password" />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="Number">
            <Label htmlFor="showcase-input-number">Quantity</Label>
            <Input defaultValue={3} id="showcase-input-number" min={0} type="number" />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="File">
            <Label htmlFor="showcase-input-file">Attachment</Label>
            <Input id="showcase-input-file" type="file" />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="Read only">
            <Label htmlFor="showcase-input-readonly">API key</Label>
            <Input defaultValue="sk_live_1234" id="showcase-input-readonly" readOnly />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="Disabled">
            <Label htmlFor="showcase-input-disabled">Company</Label>
            <Input disabled id="showcase-input-disabled" placeholder="Not editable" />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="Invalid">
            <Label htmlFor="showcase-input-invalid">Email</Label>
            <Input aria-invalid defaultValue="not-an-email" id="showcase-input-invalid" />
          </ShowcaseDemo>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="textarea">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="Default">
            <Label htmlFor="showcase-textarea-default">Message</Label>
            <Textarea id="showcase-textarea-default" placeholder="Type your message here." />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="With value">
            <Label htmlFor="showcase-textarea-value">Notes</Label>
            <Textarea
              defaultValue="The textarea grows with its content thanks to field-sizing."
              id="showcase-textarea-value"
            />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="Disabled">
            <Label htmlFor="showcase-textarea-disabled">Disabled</Label>
            <Textarea disabled id="showcase-textarea-disabled" placeholder="Not editable" />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-2" label="Invalid">
            <Label htmlFor="showcase-textarea-invalid">Bio</Label>
            <Textarea aria-invalid defaultValue="Too short" id="showcase-textarea-invalid" />
          </ShowcaseDemo>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="input-group">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1" label="Leading icon">
            <InputGroup>
              <InputGroupInput aria-label="Search" placeholder="Search..." />
              <InputGroupAddon>
                <Icon.Search />
              </InputGroupAddon>
            </InputGroup>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Text addons">
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput aria-label="Price" placeholder="0.00" />
              <InputGroupAddon align="inline-end">
                <InputGroupText>USD</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Button and keyboard hint">
            <InputGroup>
              <InputGroupInput aria-label="Command" placeholder="Run a command..." />
              <InputGroupAddon align="inline-end">
                <Kbd>⌘K</Kbd>
                <InputGroupButton>Run</InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Loading">
            <InputGroup>
              <InputGroupInput aria-label="Username" defaultValue="janedoe" disabled />
              <InputGroupAddon align="inline-end">
                <Spinner />
              </InputGroupAddon>
            </InputGroup>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Invalid">
            <InputGroup>
              <InputGroupInput aria-invalid aria-label="Website" defaultValue="example" />
              <InputGroupAddon align="inline-end">
                <Icon.AlertCircle className="text-destructive" />
              </InputGroupAddon>
            </InputGroup>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Textarea with block addon">
            <InputGroup>
              <InputGroupTextarea aria-label="Prompt" placeholder="Ask anything..." />
              <InputGroupAddon align="block-end">
                <InputGroupText>0 / 280</InputGroupText>
                <InputGroupButton
                  aria-label="Send"
                  className="ml-auto"
                  size="icon-xs"
                  variant="default"
                >
                  <Icon.ArrowUp />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </ShowcaseDemo>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="input-otp">
        <ShowcaseDemo label="Six digits with separator">
          <InputOTP aria-label="One-time password" inputMode="numeric" maxLength={6}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </ShowcaseDemo>
        <ShowcaseDemo label="Invalid">
          <InputOTP aria-label="Invalid one-time password" maxLength={4}>
            <InputOTPGroup>
              <InputOTPSlot aria-invalid index={0} />
              <InputOTPSlot aria-invalid index={1} />
              <InputOTPSlot aria-invalid index={2} />
              <InputOTPSlot aria-invalid index={3} />
            </InputOTPGroup>
          </InputOTP>
        </ShowcaseDemo>
        <ShowcaseDemo label="Disabled">
          <InputOTP aria-label="Disabled one-time password" disabled maxLength={4}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="checkbox">
        <ShowcaseDemo className="grid grid-cols-1 gap-4 sm:grid-cols-2" label="States">
          <Field orientation="horizontal">
            <Checkbox id="showcase-checkbox-unchecked" />
            <FieldLabel htmlFor="showcase-checkbox-unchecked">Unchecked</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox defaultChecked id="showcase-checkbox-checked" />
            <FieldLabel htmlFor="showcase-checkbox-checked">Checked</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="showcase-checkbox-indeterminate" indeterminate />
            <FieldLabel htmlFor="showcase-checkbox-indeterminate">Indeterminate</FieldLabel>
          </Field>
          <Field data-disabled orientation="horizontal">
            <Checkbox disabled id="showcase-checkbox-disabled" />
            <FieldLabel htmlFor="showcase-checkbox-disabled">Disabled</FieldLabel>
          </Field>
          <Field data-disabled orientation="horizontal">
            <Checkbox defaultChecked disabled id="showcase-checkbox-disabled-checked" />
            <FieldLabel htmlFor="showcase-checkbox-disabled-checked">Disabled checked</FieldLabel>
          </Field>
          <Field data-invalid orientation="horizontal">
            <Checkbox aria-invalid id="showcase-checkbox-invalid" />
            <FieldLabel htmlFor="showcase-checkbox-invalid">Invalid</FieldLabel>
          </Field>
        </ShowcaseDemo>
        <ShowcaseDemo className="grid max-w-md grid-cols-1" label="With description">
          <Field orientation="horizontal">
            <Checkbox defaultChecked id="showcase-checkbox-description" />
            <FieldContent>
              <FieldLabel htmlFor="showcase-checkbox-description">Enable notifications</FieldLabel>
              <FieldDescription>You can change this at any time in settings.</FieldDescription>
            </FieldContent>
          </Field>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="radio-group">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <ShowcaseDemo className="grid grid-cols-1" label="Default">
            <RadioGroup aria-label="Density" defaultValue="comfortable">
              <Field orientation="horizontal">
                <RadioGroupItem id="showcase-radio-default" value="default" />
                <FieldLabel htmlFor="showcase-radio-default">Default</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem id="showcase-radio-comfortable" value="comfortable" />
                <FieldLabel htmlFor="showcase-radio-comfortable">Comfortable</FieldLabel>
              </Field>
              <Field data-disabled orientation="horizontal">
                <RadioGroupItem disabled id="showcase-radio-compact" value="compact" />
                <FieldLabel htmlFor="showcase-radio-compact">Compact (disabled)</FieldLabel>
              </Field>
            </RadioGroup>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Disabled group">
            <RadioGroup aria-label="Plan" defaultValue="pro" disabled>
              <Field data-disabled orientation="horizontal">
                <RadioGroupItem id="showcase-radio-free" value="free" />
                <FieldLabel htmlFor="showcase-radio-free">Free</FieldLabel>
              </Field>
              <Field data-disabled orientation="horizontal">
                <RadioGroupItem id="showcase-radio-pro" value="pro" />
                <FieldLabel htmlFor="showcase-radio-pro">Pro</FieldLabel>
              </Field>
            </RadioGroup>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Invalid">
            <RadioGroup aria-label="Shipping">
              <Field data-invalid orientation="horizontal">
                <RadioGroupItem aria-invalid id="showcase-radio-standard" value="standard" />
                <FieldLabel htmlFor="showcase-radio-standard">Standard</FieldLabel>
              </Field>
              <Field data-invalid orientation="horizontal">
                <RadioGroupItem aria-invalid id="showcase-radio-express" value="express" />
                <FieldLabel htmlFor="showcase-radio-express">Express</FieldLabel>
              </Field>
              <FieldError>Choose a shipping method.</FieldError>
            </RadioGroup>
          </ShowcaseDemo>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="switch">
        <ShowcaseDemo className="grid grid-cols-1 gap-4 sm:grid-cols-3" label="States">
          <Field orientation="horizontal">
            <Switch id="showcase-switch-off" />
            <FieldLabel htmlFor="showcase-switch-off">Off</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch defaultChecked id="showcase-switch-on" />
            <FieldLabel htmlFor="showcase-switch-on">On</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch defaultChecked id="showcase-switch-small" size="sm" />
            <FieldLabel htmlFor="showcase-switch-small">Small</FieldLabel>
          </Field>
          <Field data-disabled orientation="horizontal">
            <Switch disabled id="showcase-switch-disabled" />
            <FieldLabel htmlFor="showcase-switch-disabled">Disabled</FieldLabel>
          </Field>
          <Field data-disabled orientation="horizontal">
            <Switch defaultChecked disabled id="showcase-switch-disabled-on" />
            <FieldLabel htmlFor="showcase-switch-disabled-on">Disabled on</FieldLabel>
          </Field>
          <Field data-invalid orientation="horizontal">
            <Switch aria-invalid id="showcase-switch-invalid" />
            <FieldLabel htmlFor="showcase-switch-invalid">Invalid</FieldLabel>
          </Field>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="slider">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1 gap-3" label="Single value">
            <span className="text-sm" id="showcase-slider-volume">
              Volume
            </span>
            <Slider aria-labelledby="showcase-slider-volume" defaultValue={[50]} />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-3" label="Range">
            <span className="text-sm" id="showcase-slider-price">
              Price range
            </span>
            <Slider aria-labelledby="showcase-slider-price" defaultValue={[25, 75]} />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-3" label="Step of 10">
            <span className="text-sm" id="showcase-slider-step">
              Steps
            </span>
            <Slider aria-labelledby="showcase-slider-step" defaultValue={[40]} step={10} />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1 gap-3" label="Disabled">
            <span className="text-sm" id="showcase-slider-disabled">
              Disabled
            </span>
            <Slider aria-labelledby="showcase-slider-disabled" defaultValue={[30]} disabled />
          </ShowcaseDemo>
        </div>
        <ShowcaseDemo className="h-44" label="Vertical">
          <Slider aria-label="Vertical slider" defaultValue={[60]} orientation="vertical" />
          <Slider aria-label="Vertical range" defaultValue={[20, 80]} orientation="vertical" />
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="select">
        <ShowcaseDemo label="Default, placeholder, and groups">
          <Select defaultValue="banana" items={FRUITS}>
            <SelectTrigger aria-label="Fruit" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                {FRUITS.map((fruit) => (
                  <SelectItem key={fruit.value} value={fruit.value}>
                    {fruit.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select items={[...FRUITS, ...VEGETABLES]}>
            <SelectTrigger aria-label="Produce" className="w-44">
              <SelectValue placeholder="Select produce" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                {FRUITS.map((fruit) => (
                  <SelectItem key={fruit.value} value={fruit.value}>
                    {fruit.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Vegetables</SelectLabel>
                {VEGETABLES.map((vegetable) => (
                  <SelectItem
                    disabled={vegetable.value === "spinach"}
                    key={vegetable.value}
                    value={vegetable.value}
                  >
                    {vegetable.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </ShowcaseDemo>
        <ShowcaseDemo label="Small, disabled, and invalid">
          <Select defaultValue="apple" items={FRUITS}>
            <SelectTrigger aria-label="Small fruit select" className="w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FRUITS.map((fruit) => (
                <SelectItem key={fruit.value} value={fruit.value}>
                  {fruit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select defaultValue="apple" disabled items={FRUITS}>
            <SelectTrigger aria-label="Disabled fruit select" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FRUITS.map((fruit) => (
                <SelectItem key={fruit.value} value={fruit.value}>
                  {fruit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select items={FRUITS}>
            <SelectTrigger aria-invalid aria-label="Invalid fruit select" className="w-36">
              <SelectValue placeholder="Required" />
            </SelectTrigger>
            <SelectContent>
              {FRUITS.map((fruit) => (
                <SelectItem key={fruit.value} value={fruit.value}>
                  {fruit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="native-select">
        <ShowcaseDemo label="Variants">
          <NativeSelect aria-label="Timezone" defaultValue="America/Chicago">
            {TIMEZONES.map((timezone) => (
              <NativeSelectOption key={timezone.value} value={timezone.value}>
                {timezone.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Produce" defaultValue="">
            <NativeSelectOption disabled value="">
              Select produce
            </NativeSelectOption>
            <NativeSelectOptGroup label="Fruits">
              {FRUITS.map((fruit) => (
                <NativeSelectOption key={fruit.value} value={fruit.value}>
                  {fruit.label}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="Vegetables">
              {VEGETABLES.map((vegetable) => (
                <NativeSelectOption key={vegetable.value} value={vegetable.value}>
                  {vegetable.label}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          </NativeSelect>
        </ShowcaseDemo>
        <ShowcaseDemo label="Small, disabled, and invalid">
          <NativeSelect aria-label="Small select" size="sm">
            <NativeSelectOption value="one">Small</NativeSelectOption>
            <NativeSelectOption value="two">Option two</NativeSelectOption>
          </NativeSelect>
          <NativeSelect aria-label="Disabled select" disabled>
            <NativeSelectOption value="one">Disabled</NativeSelectOption>
          </NativeSelect>
          <NativeSelect aria-invalid aria-label="Invalid select">
            <NativeSelectOption value="one">Invalid</NativeSelectOption>
          </NativeSelect>
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection id="combobox">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1" label="Single selection">
            <Combobox items={FRAMEWORKS}>
              <ComboboxInput aria-label="Framework" placeholder="Select a framework" />
              <ComboboxContent>
                <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
                <ComboboxList>
                  {(item: string) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="With clear button">
            <Combobox defaultValue="Astro" items={FRAMEWORKS}>
              <ComboboxInput aria-label="Framework with clear" showClear />
              <ComboboxContent>
                <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
                <ComboboxList>
                  {(item: string) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Multiple with chips">
            <ComboboxChipsDemo />
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Disabled">
            <Combobox disabled items={FRAMEWORKS}>
              <ComboboxInput aria-label="Disabled framework" disabled placeholder="Disabled" />
              <ComboboxContent>
                <ComboboxList>
                  {(item: string) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </ShowcaseDemo>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="calendar">
        <CalendarDemos />
      </ShowcaseSection>

      <ShowcaseSection id="field">
        <FieldSet className="max-w-xl">
          <FieldLegend>Profile</FieldLegend>
          <FieldDescription>
            Fields compose labels, controls, descriptions, and errors.
          </FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="showcase-field-name">Full name</FieldLabel>
              <Input id="showcase-field-name" placeholder="Jane Doe" />
              <FieldDescription>Shown on your public profile.</FieldDescription>
            </Field>
            <Field data-invalid>
              <FieldLabel htmlFor="showcase-field-email">Email</FieldLabel>
              <Input aria-invalid defaultValue="jane@" id="showcase-field-email" />
              <FieldError errors={[{ message: "Enter a valid email address" }]} />
            </Field>
            <Field data-disabled>
              <FieldLabel htmlFor="showcase-field-username">Username</FieldLabel>
              <Input defaultValue="jane" disabled id="showcase-field-username" />
              <FieldDescription>Usernames cannot be changed.</FieldDescription>
            </Field>
            <FieldSeparator>Preferences</FieldSeparator>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="showcase-field-marketing">Marketing emails</FieldLabel>
                <FieldDescription>Receive emails about new products.</FieldDescription>
              </FieldContent>
              <Switch id="showcase-field-marketing" />
            </Field>
            <Field orientation="responsive">
              <FieldContent>
                <FieldLabel htmlFor="showcase-field-timezone">Timezone</FieldLabel>
                <FieldDescription>Responsive orientation stacks on small screens.</FieldDescription>
              </FieldContent>
              <NativeSelect id="showcase-field-timezone">
                {TIMEZONES.map((timezone) => (
                  <NativeSelectOption key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <FieldLabel htmlFor="showcase-field-plan">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Pro plan</FieldTitle>
                  <FieldDescription>
                    Choice card built from a label wrapping a field.
                  </FieldDescription>
                </FieldContent>
                <Checkbox defaultChecked id="showcase-field-plan" />
              </Field>
            </FieldLabel>
          </FieldGroup>
        </FieldSet>
      </ShowcaseSection>

      <ShowcaseSection
        description={`Submitting validates asynchronously and shows a loading state. Use ${TAKEN_EMAIL} to see an async field error.`}
        id="form"
      >
        <ShowcaseFormDemo />
      </ShowcaseSection>
    </>
  )
}
