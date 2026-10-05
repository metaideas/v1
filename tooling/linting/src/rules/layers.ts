import { defineRule, type ESTree } from "adamantite/rules"
import { findSourceRoot, findViolation, locate, resolveImport, selectBoundaries } from "#layers.ts"

export default defineRule({
  create(context) {
    const root = findSourceRoot(context.filename)

    if (root === undefined) {
      return {}
    }

    const boundaries = selectBoundaries(context.options[0], root.app)
    const from = locate(root, boundaries, context.filename)

    if (from === undefined) {
      return {}
    }

    const sourceRoot = root
    const importer = from

    function check(source: ESTree.StringLiteral) {
      const target = resolveImport(sourceRoot, context.filename, source.value)
      const to = target === undefined ? undefined : locate(sourceRoot, boundaries, target)
      const violation =
        target === undefined || to === undefined ? undefined : findViolation(importer, to, target)

      if (violation !== undefined) {
        context.report({ data: { specifier: source.value }, messageId: violation, node: source })
      }
    }

    return {
      ExportAllDeclaration(node) {
        check(node.source)
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node.source)
      },
      ImportDeclaration(node) {
        check(node.source)
      },
      ImportExpression(node) {
        if (node.source.type === "Literal" && typeof node.source.value === "string") {
          check(node.source)
        }
      },
    }
  },
  meta: {
    docs: {
      description:
        "Keep application imports flowing from shared to features to routes and entrypoints.",
    },
    messages: {
      featureImportsComposition:
        "A feature can't import routes or entrypoints ({{specifier}}). Move the code into the feature or shared/.",
      featureImportsFeature:
        "A feature can't import another feature ({{specifier}}). Move the shared code into shared/.",
      routeImportsRoute:
        "A route can't import another route ({{specifier}}). Move the shared code into a feature or shared/.",
      sharedImportsUp: "shared/ can't import features, routes, or entrypoints ({{specifier}}).",
      tierImportsTier:
        "Entrypoint tiers can't import each other ({{specifier}}). Communicate through a typed contract in shared/ or the feature's schemas.ts.",
      untieredImportsTier:
        "Both entrypoint tiers load this file, so it can't import a single tier's code ({{specifier}}). Move the shared code into an untiered role.",
    },
    schema: false,
    type: "problem",
  },
})
