import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"
import { useEffect, useState } from "react"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>

type CarouselStateOptions = {
  opts?: UseCarouselParameters[0]
  plugins?: UseCarouselParameters[1]
  orientation: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

export function useCarouselState({ opts, plugins, orientation, setApi }: CarouselStateOptions) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins
  )
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  useEffect(() => {
    if (!api) return

    function handleSelect(selectedApi: NonNullable<CarouselApi>) {
      setCanScrollPrev(selectedApi.canScrollPrev())
      setCanScrollNext(selectedApi.canScrollNext())
    }

    // oxlint-disable-next-line react/set-state-in-effect -- Embla exposes scroll state only through its API, so read it once the API exists.
    handleSelect(api)
    api.on("reInit", handleSelect)
    api.on("select", handleSelect)

    return () => {
      api.off("reInit", handleSelect)
      api.off("select", handleSelect)
    }
  }, [api])

  return {
    api,
    canScrollNext,
    canScrollPrev,
    carouselRef,
    opts,
    orientation,
    scrollNext: () => {
      api?.scrollNext()
    },
    scrollPrev: () => {
      api?.scrollPrev()
    },
  }
}
