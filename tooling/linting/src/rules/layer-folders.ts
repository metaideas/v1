import { defineRule } from "adamantite/rules"
import { findSourceRoot, findStrayFolder, listLayerFolders, readBoundaries } from "#layers.ts"

export default defineRule({
  create(context) {
    const root = findSourceRoot(context.filename)

    if (root === undefined) {
      return {}
    }

    const boundaries = readBoundaries(root)
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
        "{{folder}}/ isn't a layer. Move the file into {{folders}}, or declare it in workspace.layers in this app's package.json. See docs/project-structure.md.",
    },
    schema: false,
    type: "problem",
  },
})
