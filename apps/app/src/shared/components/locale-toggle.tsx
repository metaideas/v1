import { Button } from "@v1/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@v1/ui/components/dropdown-menu"
import { Icon } from "@v1/ui/components/icon"
import { m } from "#shared/internationalization/messages.js"
import { setLocale } from "#shared/internationalization/runtime.js"

export default function LocaleToggle() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon" variant="outline" />}>
        <Icon.Languages className="size-4" />

        <span className="sr-only">{m.shared_locale_switch()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            void setLocale("es")
          }}
        >
          🇪🇸 {m.shared_locale_spanish()}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void setLocale("en")
          }}
        >
          🇺🇸 {m.shared_locale_english()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
