import { useEffect, useRef, useState } from "react"
import { CALENDAR_SELECTED_DATE, CALENDAR_SELECTED_RANGE } from "#features/showcase/constants.ts"

type CalendarRange = {
  from: Date | undefined
  to?: Date | undefined
}

export function useOpenState() {
  const [isOpen, setIsOpen] = useState(false)

  return { isOpen, setIsOpen }
}

export function useCalendarSelection() {
  const [date, setDate] = useState<Date | undefined>(CALENDAR_SELECTED_DATE)
  const [range, setRange] = useState<CalendarRange | undefined>(CALENDAR_SELECTED_RANGE)

  return { date, range, setDate, setRange }
}

export function useHasBeenInView<TElement extends Element>() {
  const ref = useRef<TElement>(null)
  const [hasBeenInView, setHasBeenInView] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || hasBeenInView) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setHasBeenInView(true)
      }
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [hasBeenInView])

  return { hasBeenInView, ref }
}
