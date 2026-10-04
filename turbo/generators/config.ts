import type { PlopTypes } from "@turbo/gen"
import { registerBullBoardGenerator } from "./commands/bull-board"
import { registerNewFeatureGenerator } from "./commands/new-feature"
import { registerNewPackageGenerator } from "./commands/new-package"
import { registerPostHogGenerator } from "./commands/posthog"
import { registerSentryGenerator } from "./commands/sentry"

export default function generator(plop: PlopTypes.NodePlopAPI) {
  registerNewFeatureGenerator(plop)
  registerNewPackageGenerator(plop)
  registerSentryGenerator(plop)
  registerPostHogGenerator(plop)
  registerBullBoardGenerator(plop)
}
