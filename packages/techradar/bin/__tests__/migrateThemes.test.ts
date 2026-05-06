import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractThemeFromConfig, type ThemeMode } from "../migrateThemes";

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function writeBytes(filePath: string, contents: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf-8");
}

const V1_FULL_CONFIG = {
  $schema: "./schema.json",
  title: "Acme",
  colors: {
    foreground: "#000000",
    background: "#FFFFFF",
    highlight: "#FF0000",
    content: "#222222",
    text: "#333333",
    link: "#0000EE",
    border: "#CCCCCC",
    tag: "#EEEEEE",
  },
  backgroundImage: "/bg.jpg",
  backgroundOpacity: 0.5,
  segments: [
    { id: "platforms", name: "Platforms", color: "#AA0000" },
    { id: "tools", name: "Tools", color: "#00AA00" },
  ],
  rings: [
    { id: "adopt", name: "Adopt", color: "#0000AA" },
    { id: "trial", name: "Trial", color: "#0000BB" },
    { id: "assess", name: "Assess", color: "#0000CC" },
    { id: "hold", name: "Hold", color: "#0000DD" },
  ],
};

function readManifest(cwd: string, themeId: string): Record<string, unknown> {
  const text = readFileSync(
    path.join(cwd, "themes", themeId, "manifest.jsonc"),
    "utf8",
  );
  return parseJsonc(text) as Record<string, unknown>;
}

function readConfig(cwd: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(cwd, "config.json"), "utf8"),
  ) as Record<string, unknown>;
}

describe("migrateThemes", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "techradar-themes-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  describe("input validation", () => {
    it("errors when defaultMode is not in supports", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "dark",
      });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe("(input)");
      expect(result.changes).toHaveLength(0);
      expect(result.backupDir).toBeNull();
    });

    it("errors when config.json is missing", () => {
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe("config.json");
      expect(result.errors[0].message).toMatch(/not found/);
    });

    it("errors when config.json is unparseable", () => {
      writeBytes(path.join(cwd, "config.json"), "{ not valid json");
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe("config.json");
    });
  });

  describe("manifest extraction (single mode)", () => {
    it("maps all 8 v1 color keys + fills 4 v2-only defaults", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      expect(result.errors).toHaveLength(0);
      const manifest = readManifest(cwd, "acme");
      expect(manifest.label).toBe("Acme");
      expect(manifest.supports).toEqual(["light"]);
      expect(manifest.default).toBe("light");
      const css = manifest.cssVariables as Record<string, unknown>;
      expect(Object.keys(css).sort()).toEqual(
        [
          "background",
          "border",
          "content",
          "footer",
          "foreground",
          "frosted",
          "highlight",
          "link",
          "shading",
          "surface",
          "tag",
          "text",
        ].sort(),
      );
      expect(css.foreground).toBe("#000000");
      expect(css.tag).toBe("#EEEEEE");
      expect(typeof css.surface).toBe("string");
    });

    it("maps segments[].color and rings[].color into radar palette", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      const manifest = readManifest(cwd, "acme");
      const radar = manifest.radar as Record<string, unknown>;
      expect(radar.segments).toEqual(["#AA0000", "#00AA00"]);
      expect(radar.rings).toEqual(["#0000AA", "#0000BB", "#0000CC", "#0000DD"]);
    });

    it("resolves segments via quadrants alias when segments key absent", () => {
      const v1WithQuadrants = {
        ...V1_FULL_CONFIG,
        segments: undefined,
        quadrants: V1_FULL_CONFIG.segments,
      };
      writeJson(path.join(cwd, "config.json"), v1WithQuadrants);
      extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      const manifest = readManifest(cwd, "acme");
      const radar = manifest.radar as Record<string, unknown>;
      expect(radar.segments).toEqual(["#AA0000", "#00AA00"]);
    });
  });

  describe("manifest extraction (dual mode)", () => {
    it("wraps every color value into {light, dark} when supports has both", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light", "dark"],
        defaultMode: "light",
      });
      const manifest = readManifest(cwd, "acme");
      const css = manifest.cssVariables as Record<string, unknown>;
      expect(css.foreground).toEqual({ light: "#000000", dark: "#000000" });
      expect(css.surface).toEqual({ light: "#FFFFFF", dark: "#111111" });
      const radar = manifest.radar as Record<string, unknown>;
      expect((radar.segments as unknown[])[0]).toEqual({
        light: "#AA0000",
        dark: "#AA0000",
      });
    });
  });

  describe("config strip", () => {
    it("removes legacy root keys, strips per-item color, inserts defaultTheme", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      const config = readConfig(cwd);
      expect(config.colors).toBeUndefined();
      expect(config.backgroundImage).toBeUndefined();
      expect(config.backgroundOpacity).toBeUndefined();
      expect(config.defaultTheme).toBe("acme");
      const segments = config.segments as Array<Record<string, unknown>>;
      expect(segments[0].color).toBeUndefined();
      expect(segments[0].id).toBe("platforms");
      const rings = config.rings as Array<Record<string, unknown>>;
      expect(rings[0].color).toBeUndefined();
      expect(rings[0].id).toBe("adopt");
    });

    it("places defaultTheme right after $schema when present", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      const text = readFileSync(path.join(cwd, "config.json"), "utf8");
      const idxSchema = text.indexOf('"$schema"');
      const idxDefault = text.indexOf('"defaultTheme"');
      expect(idxSchema).toBeGreaterThan(-1);
      expect(idxDefault).toBeGreaterThan(idxSchema);
      const idxTitle = text.indexOf('"title"');
      expect(idxDefault).toBeLessThan(idxTitle);
    });
  });

  describe("unmapped colors", () => {
    it("reports v1 colors keys that have no v2 cssVariables equivalent", () => {
      const cfg = {
        ...V1_FULL_CONFIG,
        colors: { ...V1_FULL_CONFIG.colors, accent: "#FF00FF", brand: "#123" },
      };
      writeJson(path.join(cwd, "config.json"), cfg);
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      expect(result.unmappedColors.sort()).toEqual(["accent", "brand"]);
    });
  });

  describe("asset copy", () => {
    it("copies background image from public/ into the theme dir", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      writeBytes(path.join(cwd, "public", "bg.jpg"), "FAKEJPG");
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      const expectedDest = path.join("themes", "acme", "bg.jpg");
      expect(result.changes.some((c) => c.file === expectedDest)).toBe(true);
      expect(existsSync(path.join(cwd, "themes", "acme", "bg.jpg"))).toBe(true);
      const manifest = readManifest(cwd, "acme");
      const bg = manifest.background as Record<string, unknown>;
      expect(bg.image).toBe("bg.jpg");
      expect(bg.opacity).toBe(0.5);
    });

    it("does not include an asset copy when the file is not found", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      const copyChange = result.changes.find((c) => c.file.endsWith("bg.jpg"));
      expect(copyChange).toBeUndefined();
    });
  });

  describe("backup & dry-run", () => {
    it("snapshots config.json before writing", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      expect(result.backupDir).not.toBeNull();
      const backupAbs = path.join(cwd, result.backupDir as string);
      expect(existsSync(path.join(backupAbs, "config.json"))).toBe(true);
      const backupConfig = JSON.parse(
        readFileSync(path.join(backupAbs, "config.json"), "utf8"),
      );
      expect(backupConfig.colors).toBeDefined();
      expect(backupConfig.backgroundImage).toBe("/bg.jpg");
    });

    it("write:false plans changes without backup or writes", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
        write: false,
      });
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.backupDir).toBeNull();
      expect(existsSync(path.join(cwd, "themes", "acme"))).toBe(false);
      const original = readConfig(cwd);
      expect(original.colors).toBeDefined();
    });
  });

  describe("starter manifest (no v1 theming)", () => {
    it("creates a manifest from defaults when config has no v1 colors", () => {
      const v2Like = {
        title: "Acme",
        segments: [{ id: "a", name: "A" }],
        rings: [{ id: "adopt", name: "Adopt" }],
      };
      writeJson(path.join(cwd, "config.json"), v2Like);
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light"],
        defaultMode: "light",
      });
      expect(result.errors).toHaveLength(0);
      const manifest = readManifest(cwd, "acme");
      const css = manifest.cssVariables as Record<string, unknown>;
      expect(Object.keys(css).length).toBe(12);
    });
  });

  describe("orchestrator", () => {
    it("includes manifest + config + asset in changes when all present", () => {
      writeJson(path.join(cwd, "config.json"), V1_FULL_CONFIG);
      writeBytes(path.join(cwd, "public", "bg.jpg"), "FAKE");
      const result = extractThemeFromConfig({
        cwd,
        themeId: "acme",
        label: "Acme",
        supports: ["light", "dark"] satisfies ThemeMode[],
        defaultMode: "light",
      });
      expect(result.errors).toHaveLength(0);
      const files = result.changes.map((c) => c.file);
      expect(files).toContain(path.join("themes", "acme", "manifest.jsonc"));
      expect(files).toContain("config.json");
      expect(files).toContain(path.join("themes", "acme", "bg.jpg"));
      expect(result.manifestPath).toBe(
        path.join("themes", "acme", "manifest.jsonc"),
      );
      const backupAbs = path.join(cwd, result.backupDir as string);
      const entries = readdirSync(backupAbs);
      expect(entries).toContain("config.json");
    });
  });
});
