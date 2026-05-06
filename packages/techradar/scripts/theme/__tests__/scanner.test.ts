import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scanThemes } from "../scanner";

const VALID_THEME_JSON = {
  label: "Test",
  supports: ["light", "dark"] as const,
  default: "dark" as const,
  cssVariables: {
    foreground: { light: "#111111", dark: "#FFFFFF" },
    background: { light: "#F6F6F6", dark: "#000000" },
    highlight: { light: "#0047FF", dark: "#88B5FF" },
    content: { light: "#555555", dark: "#CCCCCC" },
    text: { light: "#666666", dark: "#999999" },
    link: { light: "#0047FF", dark: "#88B5FF" },
    border: { light: "#D0D0D0", dark: "#333333" },
    tag: { light: "#E5E5E5", dark: "#333333" },
    surface: { light: "#FFFFFF", dark: "#111111" },
    footer: { light: "#FFFFFF", dark: "#212225" },
    shading: { light: "rgba(20,20,20,0.2)", dark: "rgba(20,20,20,0.67)" },
    frosted: { light: "rgba(255,255,255,0.5)", dark: "rgba(40,40,40,0.35)" },
  },
  radar: {
    segments: [
      { light: "#4A9E7E", dark: "#7EC9AA" },
      { light: "#5B8DB8", dark: "#8AB6DB" },
      { light: "#C4A85E", dark: "#E0C77E" },
      { light: "#B85B5B", dark: "#DA8A8A" },
    ],
    rings: [
      { light: "#4A9E7E", dark: "#7EC9AA" },
      { light: "#5B8DB8", dark: "#8AB6DB" },
      { light: "#C4A85E", dark: "#E0C77E" },
      { light: "#B85B5B", dark: "#DA8A8A" },
    ],
  },
};

const BASE_OPTS = {
  segmentsCount: 4,
  ringsCount: 4,
  defaultTheme: "my-theme",
};

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "scanner-test-"));
}

function writeTheme(
  baseDir: string,
  id: string,
  data: object = VALID_THEME_JSON,
): void {
  const themeDir = path.join(baseDir, id);
  fs.mkdirSync(themeDir, { recursive: true });
  fs.writeFileSync(
    path.join(themeDir, "manifest.jsonc"),
    JSON.stringify(data),
    "utf8",
  );
}

describe("scanThemes", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("discovers valid theme themes", () => {
    writeTheme(tmpDir, "my-theme");
    const result = scanThemes({ ...BASE_OPTS, builtinDir: tmpDir });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("my-theme");
    expect(result[0].supports).toEqual(["light", "dark"]);
  });

  it("warns when consumer theme overrides a builtin", () => {
    const consumerDir = makeTmpDir();
    try {
      writeTheme(tmpDir, "my-theme", { ...VALID_THEME_JSON, label: "Builtin" });
      writeTheme(consumerDir, "my-theme", {
        ...VALID_THEME_JSON,
        label: "Consumer",
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = scanThemes({
        ...BASE_OPTS,
        builtinDir: tmpDir,
        consumerDir,
      });

      expect(result[0].label).toBe("Consumer");
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    } finally {
      fs.rmSync(consumerDir, { recursive: true, force: true });
    }
  });

  it("hard-fails on legacy v1 colorScheme themes", () => {
    writeTheme(tmpDir, "legacy", {
      label: "Legacy",
      colorScheme: "dark",
      cssVariables: {},
      radar: { segments: [], rings: [] },
    });

    expect(() =>
      scanThemes({
        ...BASE_OPTS,
        builtinDir: tmpDir,
        defaultTheme: "legacy",
      }),
    ).toThrow(
      "Theme 'legacy' uses the legacy v1 schema (colorScheme field). PDS v4 + theme×mode requires the new shape — see data/themes/.example/manifest.jsonc for an annotated reference and MIGRATION.md (Section 'v1 → v2', step 3) for the field-by-field mapping. No automated migration is provided; rewrite manifest.jsonc by hand.",
    );
  });

  it("still validates radar array lengths", () => {
    writeTheme(tmpDir, "my-theme");
    expect(() =>
      scanThemes({ ...BASE_OPTS, builtinDir: tmpDir, segmentsCount: 3 }),
    ).toThrow(/radar\.segments has 4 entries but config\.segments has 3/);
  });
});
