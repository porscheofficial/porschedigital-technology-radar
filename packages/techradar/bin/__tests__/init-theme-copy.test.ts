import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

describe("init theme scaffolding", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "techradar-init-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("ships the new example and built-in porsche theme folders", () => {
    expect(
      existsSync(path.resolve("data", "themes", ".example", "manifest.jsonc")),
    ).toBe(true);
    expect(
      existsSync(path.resolve("data", "themes", "porsche", "manifest.jsonc")),
    ).toBe(true);
  });
});
