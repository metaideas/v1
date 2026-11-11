import type { PlopTypes } from "@turbo/gen"
import { registerBullBoardGenerator } from "./commands/bull-board"
import { registerEmDashGenerator } from "./commands/emdash"
import { registerNewFeatureGenerator } from "./commands/new-feature"
import { registerNewPackageGenerator } from "./commands/new-package"
import { registerPostHogGenerator } from "./commands/posthog"
import { registerRealtimeGenerator } from "./commands/realtime"
import { registerRemoteCacheGenerator } from "./commands/remote-cache"
import { registerSentryGenerator } from "./commands/sentry"
import { registerSkewGenerator } from "./commands/skew"

export default function generator(plop: PlopTypes.NodePlopAPI) {
  registerNewFeatureGenerator(plop)
  registerNewPackageGenerator(plop)
  registerSentryGenerator(plop)
  registerPostHogGenerator(plop)
  registerBullBoardGenerator(plop)
  registerRemoteCacheGenerator(plop)
  registerRealtimeGenerator(plop)
  registerEmDashGenerator(plop)
  registerSkewGenerator(plop)
}
