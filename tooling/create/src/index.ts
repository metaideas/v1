#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"

import packageJson from "#package.json" with { type: "json" }

const REPOSITORY = "https://github.com/metaideas/v1.git"
// Each release tags the commit it publishes with the package name and version, so this version of
// the initializer always downloads the template it was released with.
const TAG = `${packageJson.name}@${packageJson.version}`
const USAGE = "Usage: pnpm create @metaideas/v1 <directory> [pnpm template setup options]"

function run(command: string, args: readonly string[], cwd: string) {
  execFileSync(command, args, { cwd, stdio: "inherit" })
}

function checkIsEmptyDirectory(path: string) {
  return !existsSync(path) || readdirSync(path).length === 0
}

function checkHasPnpm() {
  try {
    execFileSync("pnpm", ["--version"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

// Clones the release tag into a fresh repository and returns the template commit it downloaded.
function download(target: string) {
  run("git", ["clone", "--quiet", "--depth", "1", "--branch", TAG, REPOSITORY, target], ".")
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: target, encoding: "utf8" })

  rmSync(join(target, ".git"), { force: true, recursive: true })
  run("git", ["init", "--quiet"], target)

  return commit.trim()
}

function create(directory: string, setupArgs: readonly string[]) {
  const target = resolve(directory)

  if (!checkIsEmptyDirectory(target))
    throw new Error(`${directory} already exists and is not empty.`)
  if (!checkHasPnpm())
    throw new Error("The template uses pnpm. Install it from https://pnpm.io/installation.")

  console.info(`Downloading metaideas/v1 at ${TAG}...`)
  let commit: string
  try {
    commit = download(target)
  } catch (error) {
    rmSync(target, { force: true, recursive: true })
    throw new Error(`Could not download metaideas/v1 at ${TAG}.`, { cause: error })
  }

  try {
    run("pnpm", ["install"], target)
    run("pnpm", ["template", "setup", "--commit", commit, ...setupArgs], target)
  } catch (error) {
    throw new Error(
      `Setup did not finish. Run \`pnpm install && pnpm template setup --commit ${commit}\` in ${directory}.`,
      { cause: error }
    )
  }
}

const [directory, ...setupArgs] = process.argv.slice(2)

if (directory === undefined || directory.startsWith("-")) {
  console.error(USAGE)
  process.exitCode = 1
} else {
  try {
    create(directory, setupArgs)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
