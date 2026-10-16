import type { PlopTypes } from "@turbo/gen"
import Bun from "bun"
import { parseJSON } from "confbox"
import * as z from "zod"

const TOKEN_NAME = "TURBO_TOKEN"
const TEAM_NAME = "TURBO_TEAM"
const TOKEN_EXPRESSION = ["$", "{{ secrets.TURBO_TOKEN }}"].join("")
const TEAM_EXPRESSION = ["$", "{{ vars.TURBO_TEAM }}"].join("")

const REMOTE_CACHE_ENV = [
  { expression: TOKEN_EXPRESSION, name: TOKEN_NAME },
  { expression: TEAM_EXPRESSION, name: TEAM_NAME },
] as const

// Bun flags that consume the next argv token. Boolean flags stay out of this set.
const BUN_VALUE_FLAGS = new Set([
  "--config",
  "--cwd",
  "--env-file",
  "--filter",
  "--preload",
  "-c",
  "-F",
])

const SHELL_OPERATORS = new Set(["&&", "||", "&", ";", "|"])

const RootScriptsSchema = z.object({
  scripts: z.record(z.string(), z.string()).optional(),
})

type Assignment = (typeof REMOTE_CACHE_ENV)[number]

type AssignmentFinding = {
  expression: string
  kind: "absent" | "conflict" | "match"
  name: string
}

function splitShell(command: string) {
  return command.split(/&&|\|\||[;&|]/u)
}

export function commandRunsTurbo(command: string) {
  return splitShell(command).some((segment) => {
    const trimmed = segment.trim()
    return (
      /^(?:bunx\s+|npx\s+|pnpm\s+exec\s+|yarn\s+)?turbo\b/u.test(trimmed)
      || /^bun(?:\s+--[\w.-]+)*\s+turbo\b/u.test(trimmed)
    )
  })
}

export function turboScriptNames(scripts: Readonly<Record<string, string>>) {
  return new Set(
    Object.entries(scripts)
      .filter(([, command]) => commandRunsTurbo(command))
      .map(([name]) => name)
  )
}

function firstBunScript(command: string) {
  const rest = /^bun run\b(.*)$/u.exec(command)?.[1] ?? ""
  const tokens = rest.match(/[^\s]+/gu) ?? []
  let script: string | undefined
  let done = false

  for (let index = 0; index < tokens.length && !done; index += 1) {
    const token = tokens[index]
    if (!token || SHELL_OPERATORS.has(token)) {
      done = true
    } else if (token === "--") {
      script = tokens[index + 1]?.replaceAll(/^["']|["']$/gu, "")
      done = true
    } else if (token.startsWith("-")) {
      if (!token.includes("=") && BUN_VALUE_FLAGS.has(token)) index += 1
    } else {
      script = token.replaceAll(/^["']|["']$/gu, "")
      done = true
    }
  }

  return script
}

function lineInvokesTurbo(line: string, turboScripts: ReadonlySet<string>) {
  const command = line
    .trim()
    .replace(/^-\s+/u, "")
    .replace(/^(?:run|command):\s*/u, "")

  if (commandRunsTurbo(command)) return true

  for (const match of command.matchAll(/\bbun run\b/gu)) {
    const script = firstBunScript(command.slice(match.index))
    if (script !== undefined && turboScripts.has(script)) return true
  }

  return false
}

export function workflowRunsTurbo(source: string, turboScripts: ReadonlySet<string>) {
  return source.split("\n").some((line) => lineInvokesTurbo(line, turboScripts))
}

function topLevelKeys(lines: readonly string[]) {
  const keys: Array<{ line: number; name: string }> = []
  for (const [index, line] of lines.entries()) {
    const name = /^([A-Za-z_][\w-]*):/u.exec(line)?.[1]
    if (name) keys.push({ line: index, name })
  }
  return keys
}

function splitSource(source: string) {
  return {
    lines: source.replace(/\n$/u, "").split("\n"),
    newline: source.endsWith("\n"),
  }
}

function joinSource(lines: readonly string[], newline: boolean) {
  const source = lines.join("\n")
  return newline ? `${source}\n` : source
}

function stripYamlValue(value: string) {
  return value
    .replace(/\s+#.*$/u, "")
    .trim()
    .replace(/^["']([\s\S]*)["']$/u, "$1")
}

function expressionMatches(value: string, expression: string) {
  const open = ["$", "{{ "].join("")
  const normalized = stripYamlValue(value)
    .replaceAll(/\$\{\{\s*/gu, open)
    .replaceAll(/\s*\}\}/gu, " }}")
    .replaceAll(/\s+/gu, " ")
    .trim()
  return normalized === expression
}

function isBlockScalar(value: string) {
  return /^[|>][+-]?\d*(?:\s+#.*)?$/u.test(value.trim())
}

function parseMappingEntry(line: string) {
  const match = /^( *)(?:"([^"]*)"|'([^']*)'|([A-Za-z_][\w.-]*))\s*:(.*)$/u.exec(line)
  const name = match?.[2] ?? match?.[3] ?? match?.[4]
  if (!match || !name) return null

  return { indent: match[1] ?? "", name, value: match[5] ?? "" }
}

function readEnvMapping(lines: readonly string[], start: number, end: number) {
  const entries: Array<{ name: string; value: string }> = []
  let mappingIndent: string | undefined
  let scalarIndent: number | undefined

  for (const line of lines.slice(start, end)) {
    if (line.trim() === "") continue

    const indent = /^( *)/u.exec(line)?.[1] ?? ""
    if (scalarIndent !== undefined && indent.length > scalarIndent) continue
    scalarIndent = undefined

    if (line.trim().startsWith("#")) continue
    if (/^\t|^\s*\t/u.test(line)) {
      return {
        detail:
          "uses tabs in env. Add TURBO_TOKEN from secrets.TURBO_TOKEN and TURBO_TEAM from vars.TURBO_TEAM by hand.",
      }
    }

    const entry = parseMappingEntry(line)
    if (!entry) {
      const nested = mappingIndent !== undefined && indent.length > mappingIndent.length
      if (nested) continue
      return {
        detail:
          "env is not a flat mapping. Add TURBO_TOKEN from secrets.TURBO_TOKEN and TURBO_TEAM from vars.TURBO_TEAM by hand.",
      }
    }

    if (mappingIndent === undefined) {
      mappingIndent = entry.indent
    } else if (entry.indent.length > mappingIndent.length) {
      continue
    } else if (entry.indent !== mappingIndent) {
      return {
        detail:
          "env entries use mixed indentation. Add TURBO_TOKEN from secrets.TURBO_TOKEN and TURBO_TEAM from vars.TURBO_TEAM by hand.",
      }
    }

    entries.push({ name: entry.name, value: entry.value })
    if (isBlockScalar(entry.value)) scalarIndent = entry.indent.length
  }

  return { entries, indent: mappingIndent ?? "  " }
}

function findingFor(
  entries: ReadonlyArray<{ name: string; value: string }>,
  assignment: Assignment
) {
  const matches = entries.filter((entry) => entry.name === assignment.name)
  const entry = matches[0]
  if (matches.length > 1 || !entry) {
    return {
      expression: assignment.expression,
      kind: matches.length > 1 ? "conflict" : "absent",
      name: assignment.name,
    } as const
  }

  return {
    expression: assignment.expression,
    kind: expressionMatches(entry.value, assignment.expression) ? "match" : "conflict",
    name: assignment.name,
  } as const
}

function withBlankLineBefore(lines: readonly string[], index: number) {
  if (index > 0 && lines[index - 1]?.trim() !== "") {
    return [...lines.slice(0, index), "", ...lines.slice(index)]
  }
  return [...lines]
}

function insertLines(lines: readonly string[], index: number, additions: readonly string[]) {
  const next = [...lines.slice(0, index), ...additions, ...lines.slice(index)]
  if (next[index + additions.length]?.trim()) {
    next.splice(index + additions.length, 0, "")
  }
  return next
}

function envAssignments(indent: string, findings: readonly AssignmentFinding[]) {
  return findings
    .filter((finding) => finding.kind === "absent")
    .map((finding) => `${indent}${finding.name}: ${finding.expression}`)
}

function insertEnvBlock(lines: readonly string[], index: number) {
  const padded = withBlankLineBefore(lines, index)
  const additions = [
    "env:",
    `  ${TOKEN_NAME}: ${TOKEN_EXPRESSION}`,
    `  ${TEAM_NAME}: ${TEAM_EXPRESSION}`,
  ]
  return insertLines(padded, index + padded.length - lines.length, additions)
}

function bodyEnd(lines: readonly string[], start: number, end: number) {
  let index = end
  while (index > start && lines[index - 1]?.trim() === "") index -= 1
  return index
}

export function wireRemoteCacheEnv(source: string) {
  const { lines, newline } = splitSource(source)
  const keys = topLevelKeys(lines)
  const env = keys.find((key) => key.name === "env")

  if (!env) {
    const jobs = keys.find((key) => key.name === "jobs")
    const inserted = insertEnvBlock(lines, jobs?.line ?? lines.length)
    return {
      detail: "set TURBO_TOKEN and TURBO_TEAM for Vercel Remote Cache",
      source: joinSource(inserted, newline),
      status: "added",
    }
  }

  const header = lines[env.line] ?? ""
  if (!/^env:\s*(?:#.*)?$/u.test(header)) {
    return {
      detail:
        "keeps env on one line. Add TURBO_TOKEN from secrets.TURBO_TOKEN and TURBO_TEAM from vars.TURBO_TEAM.",
      source,
      status: "manual",
    }
  }

  const end = keys.find((key) => key.line > env.line)?.line ?? lines.length
  const mapping = readEnvMapping(lines, env.line + 1, end)
  if ("detail" in mapping) {
    return { detail: mapping.detail, source, status: "manual" }
  }

  const findings = REMOTE_CACHE_ENV.map((assignment) => findingFor(mapping.entries, assignment))

  if (findings.some((finding) => finding.kind === "conflict")) {
    return {
      detail: `sets TURBO_TOKEN or TURBO_TEAM to a different value. Point TURBO_TOKEN at ${TOKEN_EXPRESSION} and TURBO_TEAM at ${TEAM_EXPRESSION}.`,
      source,
      status: "manual",
    }
  }

  const missing = findings.filter((finding) => finding.kind === "absent")
  if (missing.length === 0) {
    return {
      detail: "already sets the remote cache environment",
      source,
      status: "skipped",
    }
  }

  const additions = envAssignments(mapping.indent, findings)
  const inserted = insertLines(lines, bodyEnd(lines, env.line + 1, end), additions)
  return {
    detail: `added ${missing.map((finding) => finding.name).join(" and ")} for Vercel Remote Cache`,
    source: joinSource(inserted, newline),
    status: "updated",
  }
}

export async function readTurboScriptNames() {
  const manifest = RootScriptsSchema.parse(parseJSON(await Bun.file("package.json").text()))
  return turboScriptNames(manifest.scripts ?? {})
}

async function listWorkflowPaths() {
  const directory = ".github/workflows"
  const paths: string[] = []
  for await (const name of new Bun.Glob("*.{yml,yaml}").scan({ cwd: directory })) {
    paths.push(`${directory}/${name}`)
  }
  return paths.toSorted()
}

async function wireWorkflow(path: string, turboScripts: ReadonlySet<string>) {
  const source = await Bun.file(path).text()
  if (!workflowRunsTurbo(source, turboScripts)) return

  const result = wireRemoteCacheEnv(source)
  if (result.status === "manual") return `[MANUAL] ${path} ${result.detail}`
  if (result.status === "skipped") {
    return `[SKIPPED] ${path} already sets the remote cache environment`
  }

  await Bun.write(path, result.source)
  return `${path}: ${result.detail}`
}

async function wireRemoteCache() {
  const turboScripts = await readTurboScriptNames()
  const paths = await listWorkflowPaths()
  const messages = await Promise.all(paths.map((path) => wireWorkflow(path, turboScripts)))
  const results = messages.filter((message): message is string => typeof message === "string")

  if (results.length === 0) return "No GitHub Actions workflow runs Turbo."

  return [
    ...results,
    "Set the TURBO_TOKEN secret and the TURBO_TEAM variable to the Vercel team slug in the GitHub repository.",
  ].join("\n")
}

export function registerRemoteCacheGenerator(plop: PlopTypes.NodePlopAPI) {
  plop.setGenerator("remote-cache", {
    actions: () => [wireRemoteCache],
    description: "Wire Vercel Remote Cache into GitHub Actions workflows that run Turbo",
    prompts: [],
  })
}
