import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { consola } from "consola";

type ExecaFunction = typeof import("execa")["execa"];

class TrufflehogMissingError extends Error {
  constructor() {
    super("trufflehog binary not found");
    this.name = "TrufflehogMissingError";
  }
}

let cachedExeca: ExecaFunction | undefined;

async function getExeca() {
  if (!cachedExeca) {
    ({ execa: cachedExeca } = await import("execa"));
  }

  return cachedExeca;
}

function getCombinedOutput(stdout: string, stderr: string) {
  return [stdout, stderr].filter(Boolean).join("\n");
}

function getMirroredPath(stagedPath: string, temporaryDirectory: string) {
  const destinationPath = path.resolve(temporaryDirectory, stagedPath);
  const normalizedTemporaryDirectory = `${path.resolve(temporaryDirectory)}${path.sep}`;

  if (
    destinationPath !== path.resolve(temporaryDirectory) &&
    !destinationPath.startsWith(normalizedTemporaryDirectory)
  ) {
    throw new Error(
      `Refusing to write staged path outside tmpdir: ${stagedPath}`,
    );
  }

  return destinationPath;
}

export async function getStagedFiles(): Promise<string[]> {
  const execa = await getExeca();
  const { stdout } = await execa(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"],
    { encoding: "buffer" },
  );

  const output = Buffer.from(stdout).toString("utf8");

  if (!output) {
    return [];
  }

  return output.split("\0").filter(Boolean);
}

export async function materializeStagedContent(
  stagedPaths: string[],
  temporaryDirectory: string,
): Promise<void> {
  const execa = await getExeca();

  for (const stagedPath of stagedPaths) {
    const destinationPath = getMirroredPath(stagedPath, temporaryDirectory);
    const { stdout } = await execa("git", ["show", `:${stagedPath}`], {
      encoding: "buffer",
    });

    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, stdout);
  }
}

export async function runTrufflehog(
  temporaryDirectory: string,
): Promise<{ ok: boolean; output: string }> {
  const execa = await getExeca();

  try {
    const result = await execa(
      "trufflehog",
      [
        "filesystem",
        temporaryDirectory,
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

export async function main(): Promise<number> {
  const stagedFiles = await getStagedFiles();

  if (stagedFiles.length === 0) {
    consola.success("No staged files to scan for secrets.");
    return 0;
  }

  // `mkdtemp` atomically creates a uniquely-named directory with secure
  // permissions (0o700), avoiding the world-readable insecure-tmp pattern
  // flagged by CodeQL js/insecure-temporary-file.
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "precommit-secrets-"),
  );

  try {
    await materializeStagedContent(stagedFiles, temporaryDirectory);

    const result = await runTrufflehog(temporaryDirectory);

    if (!result.ok) {
      if (result.output) {
        consola.error(result.output);
      } else {
        consola.error("TruffleHog detected secrets in staged content.");
      }

      return 1;
    }

    consola.success(
      `Secret scan passed for ${stagedFiles.length} staged file(s).`,
    );
    return 0;
  } catch (error) {
    if (error instanceof TrufflehogMissingError) {
      consola.warn(
        "trufflehog is not installed locally. Install it with `brew install trufflehog` to enable pre-commit secret scanning. Skipping for now.",
      );
      return 0;
    }

    consola.error(error);
    return 1;
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
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
