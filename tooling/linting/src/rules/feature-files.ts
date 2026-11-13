import { defineRule } from "adamantite/rules/plugin"
import { FEATURE_ROLE_FILES, isAllowedFeatureFile } from "#feature-files.ts"

export default defineRule({
  create(context) {
    return {
      Program(node) {
        if (!isAllowedFeatureFile(context.filename)) {
          context.report({ data: { files: FEATURE_ROLE_FILES }, messageId: "unknownRole", node })
        }
      },
    }
  },
  meta: {
    docs: {
      description: "Keep feature folders to the shared role names in docs/project-structure.md.",
    },
    messages: {
      unknownRole:
        "Feature folders hold only assets/, components/, and {{files}}. A role file that grows becomes a folder of the same name. See docs/project-structure.md.",
    },
    type: "problem",
  },
})
