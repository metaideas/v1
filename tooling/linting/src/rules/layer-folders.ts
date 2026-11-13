import { defineRule } from "adamantite/rules/plugin"
import { findSourceRoot, findStrayFolder, listLayerFolders, isBoundaryMap } from "#layers.ts"

export default defineRule({
  create(context) {
    const root = findSourceRoot(context.filename)

    if (root === undefined) {
      return {}
    }

    const [options] = context.options
    const boundaries = isBoundaryMap(options) ? (options[root.app] ?? {}) : {}
    const folder = findStrayFolder(root, boundaries, context.filename)

    if (folder === undefined) {
      return {}
    }

    return {
      Program(node) {
        context.report({
          data: {
            folder,
            folders: listLayerFolders(boundaries)
              .map((name) => `${name}/`)
              .join(", "),
          },
          messageId: "strayFolder",
          node,
        })
      },
    }
  },
  meta: {
    docs: {
      description:
        "Keep application source in shared/, features/, or a declared route, tier, or composition folder.",
    },
    messages: {
      strayFolder:
        "{{folder}}/ isn't a layer. Move the file into {{folders}}, or declare the folder for this app in oxlint.config.ts. See docs/project-structure.md.",
    },
    schema: false,
    type: "problem",
  },
})
