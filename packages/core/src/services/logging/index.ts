/**
 * The logger a package workspace accepts. Application workspaces pass their own logger, so packages
 * emit structured events without choosing where they go.
 */
export type Logger = {
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Log fields are open. Remove after adelrodriguez/adamantite#741 is fixed.
  debug: (event: Record<string, unknown>) => void
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Log fields are open. Remove after adelrodriguez/adamantite#741 is fixed.
  info: (event: Record<string, unknown>) => void
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Log fields are open. Remove after adelrodriguez/adamantite#741 is fixed.
  warn: (event: Record<string, unknown>) => void
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Log fields are open. Remove after adelrodriguez/adamantite#741 is fixed.
  error: (event: Record<string, unknown>) => void
}
