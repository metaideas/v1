import type { PlopTypes } from "@turbo/gen"

import type * as z from "zod"

import { glob } from "node:fs/promises"
import { runCommand } from "../run-command"
import { NewPackageAnswersSchema, readPackageJson, readPackageName } from "../schemas"

type NewPackageAnswers = PlopTypes.Answers
  & z.infer<typeof NewPackageAnswersSchema> & {
    descriptionJson?: string
    packageScope?: string
    toolingPackage?: string
    typescriptVersion?: string
  }

export function registerNewPackageGenerator(plop: PlopTypes.NodePlopAPI) {
  plop.setGenerator("new-package", {
    actions: (rawAnswers) => {
      const answers: NewPackageAnswers = Object.assign(
        rawAnswers ?? {},
        NewPackageAnswersSchema.parse(rawAnswers)
      )
      const name = plop.renderString("{{kebabCase value}}", { value: answers.name })
      const packagePath = `packages/${name}`

      return [
        async () => {
          const rootPackageJson = await readPackageJson("package.json")
          const toolingPackageName = await readPackageName("tooling/tsconfig/package.json")
          let packageScope: string | undefined

          for await (const packageJsonPath of glob("{apps,packages}/*/package.json")) {
            const packageJson = await readPackageJson(packageJsonPath)
            const match = packageJson.name?.match(/^@([^/]+)\//)
            if (match?.[1]) {
              packageScope = match[1]
              break
            }
          }

          packageScope ??= rootPackageJson.name
          if (!packageScope) throw new Error("Could not determine the project package scope.")

          const typescriptVersion = rootPackageJson.devDependencies?.typescript
          if (!typescriptVersion)
            throw new Error("The root package.json must declare TypeScript in devDependencies.")

          Object.assign(answers, {
            // The manifest takes the description as a JSON string, so quotes stay valid JSON.
            descriptionJson: JSON.stringify(answers.description),
            name,
            packageScope: `@${packageScope}`,
            toolingPackage: toolingPackageName,
            typescriptVersion,
          })
          return `Prepared ${packagePath}`
        },
        {
          path: "packages/{{kebabCase name}}/package.json",
          skipIfExists: true,
          templateFile: "templates/scaffolds/new-package/package.package.json.hbs",
          type: "add",
        },
        {
          path: "packages/{{kebabCase name}}/tsconfig.json",
          skipIfExists: true,
          templateFile: "templates/scaffolds/new-package/package.tsconfig.json.hbs",
          type: "add",
        },
        {
          path: "packages/{{kebabCase name}}/turbo.json",
          skipIfExists: true,
          templateFile: "templates/scaffolds/new-package/package.turbo.json.hbs",
          type: "add",
        },
        {
          path: "packages/{{kebabCase name}}/README.md",
          skipIfExists: true,
          templateFile: "templates/scaffolds/new-package/README.md.hbs",
          type: "add",
        },
        {
          path: "packages/{{kebabCase name}}/reset.d.ts",
          skipIfExists: true,
          templateFile: "templates/scaffolds/new-package/reset.d.ts.hbs",
          type: "add",
        },
        {
          path: "packages/{{kebabCase name}}/env/.env.server",
          skipIfExists: true,
          templateFile: "templates/scaffolds/new-package/env.server.hbs",
          type: "add",
        },
        {
          path: "packages/{{kebabCase name}}/src/server.ts",
          skipIfExists: true,
          templateFile: "templates/scaffolds/new-package/server.ts.hbs",
          type: "add",
        },
        async () => {
          await runCommand(["pnpm", "install"])
          return `Created ${answers.packageScope}/${name}`
        },
      ]
    },
    description: "Generate a new package for the monorepo",
    prompts: [
      {
        message: "What is the name of the package?",
        name: "name",
        type: "input",
      },
      {
        message: "What does the package do, in one line?",
        name: "description",
        type: "input",
      },
    ],
  })
}
