import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { consola } from "consola";

import {
  getCombinedOutput,
  getExeca,
  getMirroredPath,
  isGitWorktree,
  runTrufflehogFilesystem,
  TrufflehogMissingError,
  type TrufflehogResult,
} from "./secretsScan";

export async function chdirToRepoRoot(): Promise<string> {
  const execa = await getExeca();
  const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"]);
  const repoRoot = stdout.toString().trim();
  process.chdir(repoRoot);
  return repoRoot;
}

export async function getTrackedFiles(): Promise<string[]> {
  const execa = await getExeca();
  const { stdout } = await execa("git", ["ls-files", "-z"], {
    encoding: "buffer",
  });

  const output = Buffer.from(stdout).toString("utf8");

  if (!output) {
    return [];
  }

  return output.split("\0").filter(Boolean);
}

export async function materializeTrackedContent(
  trackedPaths: string[],
  temporaryDirectory: string,
): Promise<void> {
  for (const trackedPath of trackedPaths) {
    const destinationPath = getMirroredPath(trackedPath, temporaryDirectory);

    try {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.copyFile(trackedPath, destinationPath);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        continue;
      }

      throw error;
    }
  }
}

export async function runGitHistoryScan(): Promise<TrufflehogResult> {
  const execa = await getExeca();

  try {
    const result = await execa(
      "trufflehog",
      [
        "git",
        "file://.",
        "--no-update",
        "--fail",
        "--results=verified,unknown",
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

export async function runWorkingTreeScan(): Promise<TrufflehogResult> {
  const trackedFiles = await getTrackedFiles();

  if (trackedFiles.length === 0) {
    return { ok: true, output: "" };
  }

  // `mkdtemp` atomically creates a uniquely-named directory with secure
  // permissions (0o700), avoiding the world-readable insecure-tmp pattern
  // flagged by CodeQL js/insecure-temporary-file.
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "check-secrets-"),
  );

  try {
    await materializeTrackedContent(trackedFiles, temporaryDirectory);
    return await runTrufflehogFilesystem(temporaryDirectory);
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function main(): Promise<number> {
  try {
    await chdirToRepoRoot();
    const worktree = await isGitWorktree();

    if (worktree) {
      consola.info(
        "Detected git worktree — scanning tracked files via filesystem mode (workaround for trufflesecurity/trufflehog#4553).",
      );
    }

    const result = worktree
      ? await runWorkingTreeScan()
      : await runGitHistoryScan();

    if (!result.ok) {
      if (result.output) {
        consola.error(result.output);
      } else {
        consola.error("TruffleHog detected secrets.");
      }

      return 1;
    }

    consola.success(
      worktree
        ? "Secret working-tree scan passed."
        : "Secret history scan passed.",
    );
    return 0;
  } catch (error) {
    if (error instanceof TrufflehogMissingError) {
      consola.error(
        "trufflehog is not installed. Install it with `brew install trufflehog`.",
      );
      return 1;
    }

    consola.error(error);
    return 1;
  }
}

if (require.main === module) {
  main()
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((error: unknown) => {
      consola.error(error);
      process.exit(1);
    });
}
