import { defineRule, type ESTree } from "adamantite/rules"
import { importsEnvValue, isPackageSource } from "#package-env.ts"

// Default and namespace imports carry no kind of their own, so the statement's kind applies.
function readImportKind(specifier: ESTree.ImportDeclarationSpecifier) {
  return specifier.type === "ImportSpecifier" ? specifier.importKind : undefined
}

export default defineRule({
  create(context) {
    if (!isPackageSource(context.filename)) {
      return {}
    }

    function check(
      node: ESTree.ImportDeclaration | ESTree.ExportNamedDeclaration | ESTree.ExportAllDeclaration,
      kind: "type" | "value" | undefined
    ) {
      if (node.source === null) return
      const specifierKinds =
        node.type === "ExportAllDeclaration"
          ? []
          : node.specifiers.map((specifier) =>
              specifier.type === "ExportSpecifier"
                ? specifier.exportKind
                : readImportKind(specifier)
            )

      if (importsEnvValue(node.source.value, kind, specifierKinds)) {
        context.report({ messageId: "readsEnv", node: node.source })
      }
    }

    return {
      ExportAllDeclaration(node) {
        check(node, node.exportKind)
      },
      ExportNamedDeclaration(node) {
        check(node, node.exportKind)
      },
      ImportDeclaration(node) {
        check(node, node.importKind)
      },
    }
  },
  meta: {
    docs: {
      description: "Keep package workspaces from reading ENV, so applications pass configuration.",
    },
    messages: {
      readsEnv:
        "A package workspace doesn't read ENV. Take the value as a factory option, and let the application pass it from its own ENV. See CODING_STANDARDS.md.",
    },
    type: "problem",
  },
})
