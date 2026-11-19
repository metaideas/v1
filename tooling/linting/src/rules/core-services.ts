import { defineRule } from "adamantite/rules"
import { findPackageOwnedService } from "#core-services.ts"

export default defineRule({
  create(context) {
    const service = findPackageOwnedService(context.filename)

    if (service === undefined) {
      return {}
    }

    return {
      Program(node) {
        context.report({ data: { service }, messageId: "packageOwned", node })
      },
    }
  },
  meta: {
    docs: {
      description: "Keep @v1/core/services for contracts that several packages share.",
    },
    messages: {
      packageOwned:
        "packages/core/src/services/{{service}} is named after the packages/{{service}} workspace, so it belongs there. Move it into packages/{{service}}/src and export it from that package. See CODING_STANDARDS.md.",
    },
    type: "problem",
  },
})
