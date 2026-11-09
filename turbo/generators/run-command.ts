import { spawn } from "node:child_process"

/**
 * Runs a command without a shell and shows its output. Rejects when the command exits with an
 * error.
 */
export async function runCommand([command, ...args]: readonly [string, ...string[]], cwd?: string) {
  const child = spawn(command, args, { cwd, stdio: "inherit" })
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject).once("close", resolve)
  })

  if (exitCode !== 0) {
    throw new Error(
      `Command failed: ${[command, ...args].join(" ")}. Exited with code ${exitCode}.`
    )
  }
}
