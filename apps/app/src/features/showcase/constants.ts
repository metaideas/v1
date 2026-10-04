import type { ChartConfig } from "@v1/ui/components/chart"

export type Payment = {
  amount: number
  email: string
  id: string
  status: "failed" | "processing" | "success"
}

export const SHOWCASE_GROUPS = [
  {
    id: "actions",
    sections: [
      { id: "button", title: "Button" },
      { id: "button-group", title: "Button Group" },
      { id: "toggle", title: "Toggle" },
      { id: "toggle-group", title: "Toggle Group" },
      { id: "badge", title: "Badge" },
      { id: "kbd", title: "Kbd" },
      { id: "spinner", title: "Spinner" },
      { id: "icon", title: "Icon" },
    ],
    title: "Actions",
  },
  {
    id: "forms",
    sections: [
      { id: "label", title: "Label" },
      { id: "input", title: "Input" },
      { id: "textarea", title: "Textarea" },
      { id: "input-group", title: "Input Group" },
      { id: "input-otp", title: "Input OTP" },
      { id: "checkbox", title: "Checkbox" },
      { id: "radio-group", title: "Radio Group" },
      { id: "switch", title: "Switch" },
      { id: "slider", title: "Slider" },
      { id: "select", title: "Select" },
      { id: "native-select", title: "Native Select" },
      { id: "combobox", title: "Combobox" },
      { id: "calendar", title: "Calendar" },
      { id: "field", title: "Field" },
      { id: "form", title: "Form" },
    ],
    title: "Forms",
  },
  {
    id: "overlays",
    sections: [
      { id: "dialog", title: "Dialog" },
      { id: "alert-dialog", title: "Alert Dialog" },
      { id: "sheet", title: "Sheet" },
      { id: "drawer", title: "Drawer" },
      { id: "popover", title: "Popover" },
      { id: "hover-card", title: "Hover Card" },
      { id: "tooltip", title: "Tooltip" },
      { id: "dropdown-menu", title: "Dropdown Menu" },
      { id: "context-menu", title: "Context Menu" },
      { id: "command", title: "Command" },
    ],
    title: "Overlays",
  },
  {
    id: "navigation",
    sections: [
      { id: "breadcrumb", title: "Breadcrumb" },
      { id: "pagination", title: "Pagination" },
      { id: "tabs", title: "Tabs" },
      { id: "navigation-menu", title: "Navigation Menu" },
      { id: "menubar", title: "Menubar" },
      { id: "sidebar", title: "Sidebar" },
    ],
    title: "Navigation",
  },
  {
    id: "feedback",
    sections: [
      { id: "alert", title: "Alert" },
      { id: "progress", title: "Progress" },
      { id: "skeleton", title: "Skeleton" },
      { id: "empty", title: "Empty" },
      { id: "toast", title: "Toast" },
    ],
    title: "Feedback",
  },
  {
    id: "layout",
    sections: [
      { id: "accordion", title: "Accordion" },
      { id: "collapsible", title: "Collapsible" },
      { id: "card", title: "Card" },
      { id: "item", title: "Item" },
      { id: "aspect-ratio", title: "Aspect Ratio" },
      { id: "separator", title: "Separator" },
      { id: "scroll-area", title: "Scroll Area" },
      { id: "resizable", title: "Resizable" },
      { id: "carousel", title: "Carousel" },
      { id: "avatar", title: "Avatar" },
      { id: "marker", title: "Marker" },
      { id: "typography", title: "Typography" },
    ],
    title: "Layout",
  },
  {
    id: "data",
    sections: [
      { id: "table", title: "Table" },
      { id: "data-table", title: "Data Table" },
      { id: "chart", title: "Chart" },
    ],
    title: "Data Display",
  },
  {
    id: "conversation",
    sections: [
      { id: "message", title: "Message" },
      { id: "bubble", title: "Bubble" },
      { id: "attachment", title: "Attachment" },
      { id: "message-scroller", title: "Message Scroller" },
      { id: "questionnaire", title: "Questionnaire" },
    ],
    title: "Conversation",
  },
  {
    id: "providers",
    sections: [
      { id: "theme", title: "Theme" },
      { id: "direction", title: "Direction" },
    ],
    title: "Providers",
  },
] as const

export type ShowcaseGroupId = (typeof SHOWCASE_GROUPS)[number]["id"]
export type ShowcaseSectionId = (typeof SHOWCASE_GROUPS)[number]["sections"][number]["id"]

export const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const
export const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const
export const BUTTON_ICON_SIZES = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const
export const BADGE_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const
export const TOGGLE_SIZES = ["sm", "default", "lg"] as const
export const SIDES = ["top", "right", "bottom", "left"] as const
export const BUBBLE_VARIANTS = [
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
] as const
export const ATTACHMENT_STATES = ["idle", "uploading", "processing", "error", "done"] as const
export const ATTACHMENT_SIZES = ["default", "sm", "xs"] as const
export const PROGRESS_VALUES = [0, 33, 66, 100] as const
export const ASPECT_RATIOS = [
  { label: "16 / 9", value: 16 / 9 },
  { label: "4 / 3", value: 4 / 3 },
  { label: "1 / 1", value: 1 },
] as const

export const FRUITS = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes" },
  { label: "Pineapple", value: "pineapple" },
] as const

export const VEGETABLES = [
  { label: "Carrot", value: "carrot" },
  { label: "Broccoli", value: "broccoli" },
  { label: "Spinach", value: "spinach" },
] as const

export const FRAMEWORKS = [
  "Next.js",
  "TanStack Start",
  "Astro",
  "Remix",
  "SvelteKit",
  "Nuxt",
  "Expo",
] as const

export const TIMEZONES = [
  { label: "Eastern Time", value: "America/New_York" },
  { label: "Central Time", value: "America/Chicago" },
  { label: "Pacific Time", value: "America/Los_Angeles" },
  { label: "Greenwich Mean Time", value: "Europe/London" },
  { label: "Central European Time", value: "Europe/Paris" },
] as const

export const TAKEN_EMAIL = "taken@example.com"

export const CALENDAR_DEFAULT_MONTH = new Date(2026, 5, 1)
export const CALENDAR_SELECTED_DATE = new Date(2026, 5, 12)
export const CALENDAR_SELECTED_RANGE = {
  from: new Date(2026, 5, 8),
  to: new Date(2026, 5, 17),
}

export const SCROLL_AREA_TAGS = Array.from({ length: 40 }, (_, index) => `v1.${40 - index}.0`)

export const CAROUSEL_SLIDES = [1, 2, 3, 4, 5] as const

export const SIDEBAR_ITEMS = [
  { badge: "3", icon: "Home", isActive: true, title: "Home" },
  { badge: undefined, icon: "Search", isActive: false, title: "Search" },
  { badge: "12", icon: "ArrowDown", isActive: false, title: "Inbox" },
] as const

export const NAVIGATION_LINKS = [
  { description: "Install and configure the template.", title: "Introduction" },
  { description: "Pick the workspaces you need.", title: "Installation" },
  { description: "Shared design tokens and components.", title: "Design system" },
  { description: "Re-usable building blocks.", title: "Components" },
] as const

export const SIDEBAR_PROJECTS = ["Design system", "Marketing site", "Mobile app"] as const

export const INVOICES = [
  { amount: 250, invoice: "INV001", method: "Credit Card", status: "Paid" },
  { amount: 150, invoice: "INV002", method: "PayPal", status: "Pending" },
  { amount: 350, invoice: "INV003", method: "Bank Transfer", status: "Unpaid" },
  { amount: 450, invoice: "INV004", method: "Credit Card", status: "Paid" },
  { amount: 550, invoice: "INV005", method: "PayPal", status: "Paid" },
] as const

export const PAYMENTS: Payment[] = [
  { amount: 316, email: "ken99@example.com", id: "m5gr84i9", status: "success" },
  { amount: 242, email: "abe45@example.com", id: "3u1reuv4", status: "success" },
  { amount: 837, email: "monserrat44@example.com", id: "derv1ws0", status: "processing" },
  { amount: 874, email: "silas22@example.com", id: "5kma53ae", status: "success" },
  { amount: 721, email: "carmella@example.com", id: "bhqecj4p", status: "failed" },
]

export const EMPTY_PAYMENTS: Payment[] = []

export const MONTHLY_VISITORS = [
  { desktop: 186, mobile: 80, month: "January" },
  { desktop: 305, mobile: 200, month: "February" },
  { desktop: 237, mobile: 120, month: "March" },
  { desktop: 73, mobile: 190, month: "April" },
  { desktop: 209, mobile: 130, month: "May" },
  { desktop: 214, mobile: 140, month: "June" },
] as const

export const VISITORS_CHART_CONFIG = {
  desktop: { color: "var(--chart-1)", label: "Desktop" },
  mobile: { color: "var(--chart-2)", label: "Mobile" },
} satisfies ChartConfig

export const BROWSER_SHARE = [
  { browser: "chrome", fill: "var(--color-chrome)", visitors: 275 },
  { browser: "safari", fill: "var(--color-safari)", visitors: 200 },
  { browser: "firefox", fill: "var(--color-firefox)", visitors: 187 },
  { browser: "edge", fill: "var(--color-edge)", visitors: 173 },
  { browser: "other", fill: "var(--color-other)", visitors: 90 },
] as const

export const BROWSER_CHART_CONFIG = {
  chrome: { color: "var(--chart-1)", label: "Chrome" },
  edge: { color: "var(--chart-4)", label: "Edge" },
  firefox: { color: "var(--chart-3)", label: "Firefox" },
  other: { color: "var(--chart-5)", label: "Other" },
  safari: { color: "var(--chart-2)", label: "Safari" },
  visitors: { label: "Visitors" },
} satisfies ChartConfig

export const CONVERSATION = [
  { align: "start", author: "Ada", id: "m1", text: "Did the new release go out?", time: "9:41" },
  {
    align: "end",
    author: "You",
    id: "m2",
    text: "Yes, it shipped this morning. The changelog is up as well.",
    time: "9:42",
  },
  { align: "start", author: "Ada", id: "m3", text: "Nice. Any issues so far?", time: "9:43" },
  {
    align: "end",
    author: "You",
    id: "m4",
    text: "One flaky test in CI, which I already fixed. Error rates look normal.",
    time: "9:45",
  },
  { align: "start", author: "Ada", id: "m5", text: "Great work, thanks!", time: "9:46" },
  {
    align: "end",
    author: "You",
    id: "m6",
    text: "Anytime. I will keep an eye on the dashboards today.",
    time: "9:47",
  },
  {
    align: "start",
    author: "Ada",
    id: "m7",
    text: "Let me know if you want a second pair of eyes on anything.",
    time: "9:48",
  },
] as const

export const QUESTIONNAIRE_ROLES = [
  { description: "I build user interfaces.", label: "Frontend engineer", value: "frontend" },
  { description: "I build services and APIs.", label: "Backend engineer", value: "backend" },
  { description: "I design products and flows.", label: "Designer", value: "designer" },
] as const

export const QUESTIONNAIRE_TOOLS = [
  { label: "TypeScript", value: "typescript" },
  { label: "React", value: "react" },
  { label: "Tailwind CSS", value: "tailwind" },
  { label: "Postgres", value: "postgres" },
] as const

export const QUESTIONNAIRE_ITEMS = [
  {
    choices: QUESTIONNAIRE_ROLES.map((choice) => ({ value: choice.value })),
    name: "role",
    required: true,
  },
  { choices: QUESTIONNAIRE_TOOLS.map((choice) => ({ value: choice.value })), name: "tools" },
  { name: "feedback" },
] as const

export const ATTACHMENT_DESCRIPTIONS = {
  done: "1.2 MB",
  error: "Upload failed",
  idle: "Ready to upload",
  processing: "Processing...",
  uploading: "Uploading 42%",
} as const satisfies Record<(typeof ATTACHMENT_STATES)[number], string>

export const TERMS_PARAGRAPHS = Array.from(
  { length: 12 },
  (_, index) =>
    `Section ${index + 1}. By using this product you agree to these example terms. This paragraph exists only to make the dialog tall enough to scroll.`
)

export const TEXT_DIRECTIONS = [
  {
    home: "Home",
    label: "Left to right",
    page: "Settings",
    tabs: ["Account", "Billing"],
    toggle: "Notifications",
    value: "ltr",
  },
  {
    home: "الرئيسية",
    label: "من اليمين إلى اليسار",
    page: "الإعدادات",
    tabs: ["الحساب", "الفواتير"],
    toggle: "الإشعارات",
    value: "rtl",
  },
] as const

export const AVATAR_IMAGE_SRC =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%236366f1'/><stop offset='1' stop-color='%23ec4899'/></linearGradient></defs><rect width='64' height='64' fill='url(%23g)'/></svg>"
