import { Host, Picker } from "@expo/ui"
import { Platform, Text, View } from "react-native"
import LargeTitleHeader from "#shared/components/large-title-header.ts"
import { usePersistedLocale } from "#shared/hooks.ts"
import { m } from "#shared/internationalization/messages.js"

// React Native Web renders the "label" role as a <label>, which names the picker's <select>.
// React Native's Role type omits "label", so these props stay untyped.
const pickerLabelProps: Record<string, string> = Platform.OS === "web" ? { role: "label" } : {}

function WelcomeCard({ description, title }: { description: string; title: string }) {
  return (
    <View className="gap-2 rounded-xl border border-border bg-card p-6">
      <Text className="text-lg font-semibold text-card-foreground">{title}</Text>
      <Text className="text-base leading-6 text-muted-foreground">{description}</Text>
    </View>
  )
}

export default function Screen() {
  const { locale, selectLocale } = usePersistedLocale()

  return (
    <>
      <LargeTitleHeader title={m.mobile_home_title({}, { locale })} />
      <View className="flex-1 justify-center gap-6 bg-background px-6">
        <WelcomeCard
          description={m.mobile_home_description({}, { locale })}
          title={m.mobile_home_title({}, { locale })}
        />
        <View className="items-center gap-3" {...pickerLabelProps}>
          <Text className="text-base text-foreground">
            {m.shared_locale_switch({}, { locale })}
          </Text>
          <Host matchContents>
            <Picker
              onValueChange={(nextLocale) => {
                void selectLocale(nextLocale)
              }}
              selectedValue={locale}
            >
              <Picker.Item label={m.shared_locale_english({}, { locale })} value="en" />
              <Picker.Item label={m.shared_locale_spanish({}, { locale })} value="es" />
            </Picker>
          </Host>
        </View>
      </View>
    </>
  )
}
