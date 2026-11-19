import { defineRule } from "adamantite/rules"
import { findFeatureRoles, isAllowedFeatureFile, listFeatureEntries } from "#feature-files.ts"

export default defineRule({
  create(context) {
    const roles = findFeatureRoles(context.filename)

    if (roles === undefined) {
      return {}
    }

    return {
      Program(node) {
        if (!isAllowedFeatureFile(context.filename, roles)) {
          context.report({
            data: { entries: listFeatureEntries(roles) },
            messageId: "unknownRole",
            node,
          })
        }
      },
    }
  },
  meta: {
    docs: {
      description:
        "Keep feature folders to the roles that their application workspace allows in docs/project-structure.md.",
    },
    messages: {
      unknownRole:
        "Features in this app hold only {{entries}}. A role file that grows becomes a folder of the same name. Allowed roles come from workspace.features.roles in the app's package.json. See docs/project-structure.md.",
    },
    type: "problem",
  },
})
