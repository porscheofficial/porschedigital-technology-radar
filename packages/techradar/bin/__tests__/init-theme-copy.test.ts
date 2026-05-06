import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

  // Regression: themes were scaffolded into `<consumer>/data/themes/` (hidden
  // alongside generated build inputs) and never synced into `.techradar/`,
  // so consumer edits had zero effect. They must land at top-level `themes/`
  // (sibling of `radar/`) and be copied into `.techradar/data/themes/` on each
  // build via syncThemesToBuildDir().
  it("scaffolds themes into top-level <consumer>/themes/, not data/themes/", () => {
    const binSource = readFileSync(path.resolve("bin", "techradar.ts"), "utf8");
    expect(binSource).toMatch(/scaffold\(\s*join\(CWD, "themes", theme\)/);
    expect(binSource).not.toMatch(
      /scaffold\(\s*join\(CWD, "data", "themes", theme\)/,
    );
  });

  it("syncs <consumer>/themes/ into the shadow build's data/themes/", () => {
    const binSource = readFileSync(path.resolve("bin", "techradar.ts"), "utf8");
    expect(binSource).toContain("function syncThemesToBuildDir");
    expect(binSource).toMatch(/syncThemesToBuildDir\(\)/);
    expect(binSource).toMatch(
      /cpSync\(consumerThemes, themesBuild, \{ recursive: true \}\)/,
    );
  });

  it("watches <consumer>/themes/ in dev mode", () => {
    const binSource = readFileSync(path.resolve("bin", "techradar.ts"), "utf8");
    expect(binSource).toMatch(/const themesDir = join\(CWD, "themes"\)/);
    expect(binSource).toMatch(
      /watch\(\s*\[radarDir, themesDir, aboutFile, customFile, configFile\]/,
    );
  });
});
