import { useEffect, useState } from "react"

export function useCopyState() {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeout = setTimeout(() => {
      setCopied(false)
    }, 2000)
    return () => {
      clearTimeout(timeout)
    }
  }, [copied])

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return { copied, copy }
}
