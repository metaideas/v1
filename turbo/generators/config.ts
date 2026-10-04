import type { PlopTypes } from "@turbo/gen"
import { registerAiChatDemoGenerator } from "./commands/ai-chat-demo"
import { registerFilesClientGenerator } from "./commands/files-client"
import { registerNewFeatureGenerator } from "./commands/new-feature"
import { registerNewPackageGenerator } from "./commands/new-package"
import { registerPostHogGenerator } from "./commands/posthog"
import { registerSentryGenerator } from "./commands/sentry"

export default function generator(plop: PlopTypes.NodePlopAPI) {
  registerNewFeatureGenerator(plop)
  registerNewPackageGenerator(plop)
  registerFilesClientGenerator(plop)
  registerAiChatDemoGenerator(plop)
  registerSentryGenerator(plop)
  registerPostHogGenerator(plop)
}
