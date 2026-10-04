import type { Stack } from "expo-router"
import type * as React from "react"
import type { TextInputSubmitEditingEvent } from "react-native"
import type { SearchBarCommands } from "react-native-screens"

type NativeStackNavigationOptions = Exclude<
  NonNullable<React.ComponentPropsWithoutRef<typeof Stack.Screen>["options"]>,
  // oxlint-disable-next-line no-explicit-any
  (props: any) => any
>

type ScreenOptions = Pick<
  NativeStackNavigationOptions,
  | "animation"
  | "animationDuration"
  | "contentStyle"
  | "navigationBarColor"
  | "animationTypeForReplace"
  | "autoHideHomeIndicator"
  | "gestureEnabled"
  | "freezeOnBlur"
  | "fullScreenGestureEnabled"
  | "gestureDirection"
  | "navigationBarHidden"
  | "orientation"
  | "presentation"
  | "statusBarTranslucent"
  | "statusBarStyle"
  | "statusBarHidden"
  | "statusBarAnimation"
  | "title"
  | "animationMatchesGesture"
  | "fullScreenGestureShadowEnabled"
  | "gestureResponseDistance"
  | "navigationBarTranslucent"
  | "keyboardHandlingEnabled"
  | "sheetAllowedDetents"
  | "sheetCornerRadius"
  | "sheetElevation"
  | "sheetExpandsWhenScrolledToEdge"
  | "sheetGrabberVisible"
  | "sheetInitialDetentIndex"
  | "sheetLargestUndimmedDetentIndex"
  | "unstable_sheetFooter"
>

type HeaderOptions = Omit<NativeStackNavigationOptions, keyof ScreenOptions>

type NativeStackNavigationSearchBarOptions = NonNullable<HeaderOptions["headerSearchBarOptions"]>

type LargeTitleSearchBarMethods = Omit<SearchBarCommands, "blur" | "toggleCancelButton">

type LargeTitleHeaderProps = {
  iosBackButtonMenuEnabled?: boolean
  iosBackButtonTitle?: string
  /**
   * Default is 'systemMaterial'
   */
  iosBlurEffect?: HeaderOptions["headerBlurEffect"] | "none"
  materialPreset?: "stack" | "inline"
  materialTitleClassName?: string
  backVisible?: boolean
  /**
   * IOS - iosBlurEffect must be set to 'none' for this to work
   *
   * @default iOS: true | Material: false
   */
  shadowVisible?: boolean
  leftView?: HeaderOptions["headerLeft"]
  rightView?: HeaderOptions["headerRight"]
  shown?: boolean
  title?: string
  backgroundColor?: string
  screen?: ScreenOptions
  searchBar?: {
    iosCancelButtonText?: string
    iosHideWhenScrolling?: boolean
    iosTintColor?: string
    materialRightView?: HeaderOptions["headerRight"]
    materialBlurOnSubmit?: boolean
    materialOnSubmitEditing?: ((event: TextInputSubmitEditingEvent) => void) | undefined
    autoCapitalize?: NativeStackNavigationSearchBarOptions["autoCapitalize"]
    inputType?: NativeStackNavigationSearchBarOptions["inputType"]
    onBlur?: () => void
    onCancelButtonPress?: () => void
    onChangeText?: (text: string) => void
    onFocus?: () => void
    onSearchButtonPress?: () => void
    placeholder?: string
    ref?: React.Ref<LargeTitleSearchBarMethods>
    textColor?: string
    content?: React.ReactNode
  }
}

export type {
  LargeTitleHeaderProps,
  LargeTitleSearchBarMethods,
  NativeStackNavigationOptions,
  NativeStackNavigationSearchBarOptions,
}
