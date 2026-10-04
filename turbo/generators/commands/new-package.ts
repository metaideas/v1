import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"

import type * as z from "zod"

import { NewPackageAnswersSchema, readPackageJson, readPackageName } from "../schemas"

type NewPackageAnswers = PlopTypes.Answers
  & z.infer<typeof NewPackageAnswersSchema> & {
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
          const workspacePackageJsonPaths = new Bun.Glob("{apps,packages}/*/package.json")
          let packageScope: string | undefined

          for await (const packageJsonPath of workspacePackageJsonPaths.scan({
            cwd: process.cwd(),
          })) {
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
          path: "packages/{{kebabCase name}}/src/index.ts",
          skipIfExists: true,
          templateFile: "templates/scaffolds/new-package/index.ts.hbs",
          type: "add",
        },
        async () => {
          await Bun.$`bun install`
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
    ],
  })
}
