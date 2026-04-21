import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { consola } from "consola";

import {
  getStagedFiles,
  main,
  materializeStagedContent,
  runTrufflehog,
} from "../preCommitSecrets";

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

const mockedExeca = execaState.execa;

describe("preCommitSecrets", () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetAllMocks();

    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => fs.rm(directory, { recursive: true, force: true })),
    );
  });

  it("parses NUL-separated staged paths", async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: Buffer.from("README.md\0src/über file.ts\0"),
    } as never);

    await expect(getStagedFiles()).resolves.toEqual([
      "README.md",
      "src/über file.ts",
    ]);

    expect(mockedExeca).toHaveBeenCalledWith(
      "git",
      ["diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"],
      { encoding: "buffer" },
    );
  });

  it("returns an empty list when nothing is staged", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: Buffer.from("") } as never);

    await expect(getStagedFiles()).resolves.toEqual([]);
  });

  it("materializes staged content into nested directories", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "precommit-secrets-test-"),
    );
    temporaryDirectories.push(temporaryDirectory);

    mockedExeca.mockResolvedValueOnce({
      stdout: Buffer.from("staged markdown"),
    } as never);

    await materializeStagedContent(
      ["docs/nested/example.md"],
      temporaryDirectory,
    );

    await expect(
      fs.readFile(
        path.join(temporaryDirectory, "docs", "nested", "example.md"),
        "utf8",
      ),
    ).resolves.toBe("staged markdown");
  });

  it("handles multiple staged paths with subdirectories", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "precommit-secrets-test-"),
    );
    temporaryDirectories.push(temporaryDirectory);

    mockedExeca
      .mockResolvedValueOnce({ stdout: Buffer.from("alpha") } as never)
      .mockResolvedValueOnce({ stdout: Buffer.from('{"ok":true}') } as never);

    await materializeStagedContent(
      ["folder with spaces/file.txt", "src/deep/path/data.json"],
      temporaryDirectory,
    );

    await expect(
      fs.readFile(
        path.join(temporaryDirectory, "folder with spaces", "file.txt"),
        "utf8",
      ),
    ).resolves.toBe("alpha");

    await expect(
      fs.readFile(
        path.join(temporaryDirectory, "src", "deep", "path", "data.json"),
        "utf8",
      ),
    ).resolves.toBe('{"ok":true}');
  });

  it("returns trufflehog output without running the binary end-to-end", async () => {
    mockedExeca.mockResolvedValueOnce({
      exitCode: 1,
      stdout: '{"SourceMetadata":{"Data":{"Filesystem":{"file":"tmp/file"}}}}',
      stderr: "scan failed",
    } as never);

    await expect(runTrufflehog("/tmp/staged")).resolves.toEqual({
      ok: false,
      output:
        '{"SourceMetadata":{"Data":{"Filesystem":{"file":"tmp/file"}}}}\nscan failed',
    });
  });

  it("warns and exits zero when trufflehog is missing locally", async () => {
    const warnSpy = vi.spyOn(consola, "warn").mockImplementation(vi.fn());

    mockedExeca.mockImplementation((async (
      command: string | URL,
      argsOrOptions?: unknown,
    ) => {
      const args = Array.isArray(argsOrOptions) ? argsOrOptions : undefined;

      if (command === "git" && args?.[0] === "diff") {
        return { stdout: Buffer.from("README.md\0") } as never;
      }

      if (command === "git" && args?.[0] === "show") {
        return { stdout: Buffer.from("safe staged content") } as never;
      }

      const error = new Error("spawn trufflehog ENOENT") as Error & {
        code: string;
      };
      error.code = "ENOENT";
      throw error;
    }) as never);

    await expect(main()).resolves.toBe(0);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("brew install trufflehog"),
    );
  });
});
