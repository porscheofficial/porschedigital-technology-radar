import { type SpawnSyncOptions, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

import { ScaffoldError } from "./errors.ts";
import {
  getExecCommand,
  getInstallCommand,
  type PackageManager,
} from "./packageManager.ts";

const EXEC_SUFFIXES =
  process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];

export function isCommandOnPath(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (command.includes("/") || command.includes("\\"))
    return existsSync(command);
  const pathEnv = env.PATH ?? env.Path ?? "";
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue;
    for (const suffix of EXEC_SUFFIXES) {
      if (existsSync(join(dir, command + suffix))) return true;
    }
  }
  return false;
}

export interface RunResult {
  status: number;
}

function runCommand(
  command: string,
  args: readonly string[],
  options: SpawnSyncOptions = {},
): RunResult {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.error) {
    throw new ScaffoldError(
      `Failed to spawn \`${command}\`: ${result.error.message}.`,
      "Make sure the binary is installed and on your PATH.",
      result.error,
    );
  }
  return { status: result.status ?? 1 };
}

export function runInstall(pm: PackageManager, cwd: string): RunResult {
  const { command, args } = getInstallCommand(pm);
  const result = runCommand(command, args, { cwd });
  if (result.status !== 0) {
    throw new ScaffoldError(
      `\`${command} ${args.join(" ")}\` exited with status ${result.status}.`,
      "Inspect the install output above and re-run when the issue is resolved.",
    );
  }
  return result;
}

export function runTechradarInit(pm: PackageManager, cwd: string): RunResult {
  const { command, args } = getExecCommand(pm, "techradar", ["init"]);
  const result = runCommand(command, args, { cwd });
  if (result.status !== 0) {
    throw new ScaffoldError(
      `\`${command} ${args.join(" ")}\` exited with status ${result.status}.`,
      "Inspect the techradar init output above and re-run when the issue is resolved.",
    );
  }
  return result;
}

export interface GitInitResult {
  ran: boolean;
  reason?: string;
}

export function runGitInit(cwd: string): GitInitResult {
  if (!isCommandOnPath("git")) {
    return { ran: false, reason: "git is not on PATH" };
  }
  if (existsSync(join(cwd, ".git"))) {
    return {
      ran: false,
      reason: ".git already exists in the target directory",
    };
  }
  const init = spawnSync("git", ["init", "--quiet"], { cwd, stdio: "inherit" });
  if ((init.status ?? 1) !== 0) {
    return { ran: false, reason: "git init failed" };
  }
  spawnSync("git", ["add", "."], { cwd, stdio: "inherit" });
  const commit = spawnSync(
    "git",
    [
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "--no-verify",
      "-m",
      "chore: initial scaffold via @porscheofficial/create-techradar",
    ],
    { cwd, stdio: "inherit" },
  );
  if ((commit.status ?? 1) !== 0) {
    return {
      ran: true,
      reason: "git commit failed (working tree initialised, no commit created)",
    };
  }
  return { ran: true };
}
