import { Button } from "@v1/ui/components/button"
import { m } from "#shared/internationalization/messages.js"
import {
  getLocale,
  type Locale,
  setLocale as setParaglideLocale,
} from "#shared/internationalization/runtime.js"

function selectLocale(nextLocale: Locale) {
  void setParaglideLocale(nextLocale)
}

export default function LocaleToggle() {
  const locale = getLocale()

  return (
    <fieldset className="flex gap-2">
      <legend className="sr-only">{m.shared_locale_switch()}</legend>
      <Button
        aria-pressed={locale === "en"}
        onClick={() => {
          selectLocale("en")
        }}
        size="sm"
        variant={locale === "en" ? "default" : "outline"}
      >
        {m.shared_locale_english()}
      </Button>
      <Button
        aria-pressed={locale === "es"}
        onClick={() => {
          selectLocale("es")
        }}
        size="sm"
        variant={locale === "es" ? "default" : "outline"}
      >
        {m.shared_locale_spanish()}
      </Button>
    </fieldset>
  )
}
