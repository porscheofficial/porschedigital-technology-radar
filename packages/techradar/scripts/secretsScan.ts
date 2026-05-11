import fs from "node:fs/promises";
import path from "node:path";

type ExecaFunction = typeof import("execa")["execa"];

export class TrufflehogMissingError extends Error {
  constructor() {
    super("trufflehog binary not found");
    this.name = "TrufflehogMissingError";
  }
}

let cachedExeca: ExecaFunction | undefined;

export async function getExeca(): Promise<ExecaFunction> {
  if (!cachedExeca) {
    ({ execa: cachedExeca } = await import("execa"));
  }

  return cachedExeca;
}

export function getCombinedOutput(stdout: string, stderr: string): string {
  return [stdout, stderr].filter(Boolean).join("\n");
}

export function getMirroredPath(
  relativePath: string,
  temporaryDirectory: string,
): string {
  const destinationPath = path.resolve(temporaryDirectory, relativePath);
  const normalizedTemporaryDirectory = `${path.resolve(temporaryDirectory)}${path.sep}`;

  if (
    destinationPath !== path.resolve(temporaryDirectory) &&
    !destinationPath.startsWith(normalizedTemporaryDirectory)
  ) {
    throw new Error(`Refusing to write path outside tmpdir: ${relativePath}`);
  }

  return destinationPath;
}

/**
 * Returns `true` when the current working directory is inside a Git worktree
 * created via `git worktree add` (i.e. `.git` is a file pointing at the shared
 * gitdir, not a directory). Worktrees trigger an upstream trufflehog crash —
 * see `trufflesecurity/trufflehog#4553` and the worktree caveat in ADR-0011.
 */
export async function isGitWorktree(): Promise<boolean> {
  try {
    const stats = await fs.stat(".git");
    return stats.isFile();
  } catch {
    return false;
  }
}

export interface TrufflehogResult {
  ok: boolean;
  output: string;
}

export async function runTrufflehogFilesystem(
  targetDirectory: string,
): Promise<TrufflehogResult> {
  const execa = await getExeca();

  try {
    const result = await execa(
      "trufflehog",
      [
        "filesystem",
        targetDirectory,
        "--fail",
        "--results=verified,unknown",
        "--no-update",
        "--json",
      ],
      { reject: false },
    );

    return {
      ok: result.exitCode === 0,
      output: getCombinedOutput(result.stdout, result.stderr),
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new TrufflehogMissingError();
    }

    throw error;
  }
}
