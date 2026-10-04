import type { SearchBarCommands } from "react-native-screens"
import { Stack } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { useCSSVariable, useUniwind } from "uniwind"
import type {
  LargeTitleHeaderProps,
  NativeStackNavigationOptions,
} from "#shared/components/large-title-header/types.ts"
import { useLargeTitleSearch } from "#shared/components/large-title-header/use-large-title-search.ts"
import { isLiquidGlassSupported } from "#shared/utils.ts"

function propsToScreenOptions(
  props: LargeTitleHeaderProps,
  backgroundColor: string | undefined,
  search: ReturnType<typeof useLargeTitleSearch>
): NativeStackNavigationOptions {
  return {
    headerBackButtonMenuEnabled: props.iosBackButtonMenuEnabled,
    headerBackTitle: props.iosBackButtonTitle,
    headerBackVisible: props.backVisible,
    headerBlurEffect: isLiquidGlassSupported
      ? undefined
      : props.iosBlurEffect === "none"
        ? undefined
        : (props.iosBlurEffect ?? "systemMaterial"),
    headerLargeStyle: isLiquidGlassSupported
      ? undefined
      : { backgroundColor: props.backgroundColor ?? backgroundColor },
    headerLargeTitle: true,
    headerLargeTitleShadowVisible: props.shadowVisible,
    headerLeft: props.leftView,
    headerRight: props.rightView,
    headerSearchBarOptions: props.searchBar
      ? {
          autoCapitalize: props.searchBar.autoCapitalize,
          cancelButtonText: props.searchBar.iosCancelButtonText,
          hideWhenScrolling: props.searchBar.iosHideWhenScrolling ?? false,
          inputType: props.searchBar.inputType,
          onBlur: search.handleBlur,
          onCancelButtonPress: props.searchBar.onCancelButtonPress,
          onChangeText: (event) => {
            search.changeText(event.nativeEvent.text)
          },
          onFocus: search.handleFocus,
          onSearchButtonPress: props.searchBar.onSearchButtonPress,
          placeholder: props.searchBar.placeholder ?? "Search...",
          textColor: props.searchBar.textColor,
          tintColor: props.searchBar.iosTintColor,
        }
      : undefined,
    headerShadowVisible: props.shadowVisible,
    headerShown: props.shown,
    headerStyle:
      props.iosBlurEffect === "none"
        ? { backgroundColor: props.backgroundColor ?? backgroundColor }
        : undefined,
    headerTitle: props.title,
    headerTransparent: isLiquidGlassSupported || props.iosBlurEffect !== "none",
    ...props.screen,
  }
}

export default function LargeTitleHeader(props: LargeTitleHeaderProps) {
  const { theme } = useUniwind()
  const [background, card] = useCSSVariable(["--color-background", "--color-card"])
  const search = useLargeTitleSearch(props.searchBar)
  const nativeSearchBarRef = React.useRef<SearchBarCommands>(null)
  const headerBackground = theme === "dark" ? background : card

  React.useImperativeHandle(props.searchBar?.ref, () => ({
    cancelSearch: () => nativeSearchBarRef.current?.cancelSearch(),
    clearText: () => nativeSearchBarRef.current?.clearText(),
    focus: () => nativeSearchBarRef.current?.focus(),
    setText: (text) => nativeSearchBarRef.current?.setText(text),
  }))

  const screenOptions = propsToScreenOptions(
    props,
    typeof headerBackground === "string" ? headerBackground : undefined,
    search
  )

  return (
    <>
      <Stack.Screen
        options={{
          ...screenOptions,
          headerSearchBarOptions: screenOptions.headerSearchBarOptions && {
            ...screenOptions.headerSearchBarOptions,
            ref: nativeSearchBarRef,
          },
        }}
      />
      {props.searchBar && search.isOverlayShown ? (
        <Animated.View
          className="z-[99999]"
          entering={FadeIn.duration(500)}
          style={StyleSheet.absoluteFill}
        >
          <View style={StyleSheet.absoluteFill}>{props.searchBar.content}</View>
        </Animated.View>
      ) : null}
    </>
  )
}
