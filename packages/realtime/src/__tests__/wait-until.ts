/**
 * Resolves once `condition` holds, polling every 5 ms, and rejects after 2 seconds.
 */
export function waitUntil(condition: () => boolean) {
  return new Promise<void>((resolve, reject) => {
    const started = Date.now()
    const timer = setInterval(() => {
      if (condition()) {
        clearInterval(timer)
        resolve()
      } else if (Date.now() - started > 2000) {
        clearInterval(timer)
        reject(new Error("The condition never became true"))
      }
    }, 5)
  })
}
