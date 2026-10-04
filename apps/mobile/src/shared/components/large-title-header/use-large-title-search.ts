import * as React from "react"
import { BackHandler, Platform } from "react-native"
import type { LargeTitleHeaderProps } from "#shared/components/large-title-header/types.ts"

export function useLargeTitleSearch(searchBar: LargeTitleHeaderProps["searchBar"]) {
  const [searchValue, setSearchValue] = React.useState("")
  const [isFocused, setIsFocused] = React.useState(false)
  const [isSearchBarShown, setIsSearchBarShown] = React.useState(false)
  const onChangeText = searchBar?.onChangeText

  React.useEffect(() => {
    if (Platform.OS !== "android" || !isSearchBarShown) return

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setIsSearchBarShown(false)
      setSearchValue("")
      onChangeText?.("")
      return true
    })

    return () => {
      subscription.remove()
    }
  }, [isSearchBarShown, onChangeText])

  function changeText(text: string) {
    setSearchValue(text)
    onChangeText?.(text)
  }

  return {
    changeText,
    clearText: () => {
      changeText("")
      searchBar?.onCancelButtonPress?.()
    },
    closeSearchBar: () => {
      setIsSearchBarShown(false)
      changeText("")
    },
    handleBlur: () => {
      setIsFocused(false)
      if (searchValue.length === 0) setIsSearchBarShown(false)
      searchBar?.onBlur?.()
    },
    handleFocus: () => {
      setIsFocused(true)
      searchBar?.onFocus?.()
    },
    isOverlayShown: Boolean(searchBar?.content) && (isFocused || searchValue.length > 0),
    isSearchBarShown,
    searchValue,
    showSearchBar: () => {
      setIsSearchBarShown(true)
    },
  }
}
