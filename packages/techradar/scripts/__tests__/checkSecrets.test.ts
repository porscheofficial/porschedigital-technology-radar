import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { consola } from "consola";

import {
  chdirToRepoRoot,
  getTrackedFiles,
  main,
  materializeTrackedContent,
  runGitHistoryScan,
  runWorkingTreeScan,
} from "../checkSecrets";

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

const mockedExeca = execaState.execa;

describe("checkSecrets", () => {
  const temporaryDirectories: string[] = [];
  const originalCwd = process.cwd();

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
    vi.resetAllMocks();

    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => fs.rm(directory, { recursive: true, force: true })),
    );
  });

  it("parses NUL-separated tracked paths", async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: Buffer.from("README.md\0src/über file.ts\0"),
    } as never);

    await expect(getTrackedFiles()).resolves.toEqual([
      "README.md",
      "src/über file.ts",
    ]);

    expect(mockedExeca).toHaveBeenCalledWith("git", ["ls-files", "-z"], {
      encoding: "buffer",
    });
  });

  it("returns an empty list when nothing is tracked", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: Buffer.from("") } as never);

    await expect(getTrackedFiles()).resolves.toEqual([]);
  });

  it("copies tracked files into nested mirror directories", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "check-secrets-test-"),
    );
    temporaryDirectories.push(temporaryDirectory);

    const sourceDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "check-secrets-source-"),
    );
    temporaryDirectories.push(sourceDirectory);

    const nestedSourcePath = path.join(sourceDirectory, "a", "b", "c.txt");
    await fs.mkdir(path.dirname(nestedSourcePath), { recursive: true });
    await fs.writeFile(nestedSourcePath, "hello");

    process.chdir(sourceDirectory);

    await materializeTrackedContent(["a/b/c.txt"], temporaryDirectory);

    await expect(
      fs.readFile(path.join(temporaryDirectory, "a", "b", "c.txt"), "utf8"),
    ).resolves.toBe("hello");
  });

  it("skips tracked-but-deleted files silently", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "check-secrets-test-"),
    );
    temporaryDirectories.push(temporaryDirectory);

    await expect(
      materializeTrackedContent(["does/not/exist.txt"], temporaryDirectory),
    ).resolves.toBeUndefined();
  });

  it("chdirs to the repo top-level", async () => {
    const sandbox = await fs.mkdtemp(
      path.join(os.tmpdir(), "check-secrets-cwd-"),
    );
    temporaryDirectories.push(sandbox);
    const realSandbox = await fs.realpath(sandbox);

    mockedExeca.mockResolvedValueOnce({ stdout: realSandbox } as never);

    await expect(chdirToRepoRoot()).resolves.toBe(realSandbox);
    expect(await fs.realpath(process.cwd())).toBe(realSandbox);
  });

  it("scans git history when not in a worktree", async () => {
    mockedExeca.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    } as never);

    await expect(runGitHistoryScan()).resolves.toEqual({
      ok: true,
      output: "",
    });

    expect(mockedExeca).toHaveBeenCalledWith(
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
  });

  it("scans the working tree via filesystem mode", async () => {
    const sandbox = await fs.mkdtemp(
      path.join(os.tmpdir(), "check-secrets-wt-"),
    );
    temporaryDirectories.push(sandbox);
    await fs.writeFile(path.join(sandbox, "tracked.txt"), "content");
    process.chdir(sandbox);

    mockedExeca
      .mockResolvedValueOnce({
        stdout: Buffer.from("tracked.txt\0"),
      } as never)
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: "",
      } as never);

    await expect(runWorkingTreeScan()).resolves.toEqual({
      ok: true,
      output: "",
    });

    const trufflehogCall = mockedExeca.mock.calls.find(
      (call) => call[0] === "trufflehog",
    );
    expect(trufflehogCall?.[1]).toEqual(
      expect.arrayContaining([
        "filesystem",
        "--fail",
        "--results=verified,unknown",
        "--no-update",
        "--json",
      ]),
    );
  });

  it("returns ok with no scan when nothing is tracked", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: Buffer.from("") } as never);

    await expect(runWorkingTreeScan()).resolves.toEqual({
      ok: true,
      output: "",
    });

    expect(mockedExeca).toHaveBeenCalledTimes(1);
  });

  it("fails when trufflehog is missing in non-worktree mode", async () => {
    const sandbox = await fs.mkdtemp(
      path.join(os.tmpdir(), "check-secrets-missing-"),
    );
    temporaryDirectories.push(sandbox);

    const errorSpy = vi.spyOn(consola, "error").mockImplementation(vi.fn());

    mockedExeca.mockImplementation((async (
      command: string | URL,
      argsOrOptions?: unknown,
    ) => {
      const args = Array.isArray(argsOrOptions) ? argsOrOptions : undefined;

      if (command === "git" && args?.[0] === "rev-parse") {
        return { stdout: sandbox } as never;
      }

      const error = new Error("spawn trufflehog ENOENT") as Error & {
        code: string;
      };
      error.code = "ENOENT";
      throw error;
    }) as never);

    await expect(main()).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("brew install trufflehog"),
    );
  });
});
