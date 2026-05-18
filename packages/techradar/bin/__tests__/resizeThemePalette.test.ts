import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resizeThemeManifestFile,
  resizeThemeManifestPalettes,
} from "../resizeThemePalette";

const BASE_MANIFEST = `{
  // Annotated manifest — comments must survive surgical resize.
  "label": "Test",
  "supports": ["light", "dark"],
  "default": "dark",
  "cssVariables": {
    "foreground": { "light": "#111", "dark": "#FFF" }
  },
  "radar": {
    "segments": [
      { "light": "#A", "dark": "#a" },
      { "light": "#B", "dark": "#b" },
      { "light": "#C", "dark": "#c" },
      { "light": "#D", "dark": "#d" }
    ],
    "rings": [
      { "light": "#R1", "dark": "#r1" },
      { "light": "#R2", "dark": "#r2" }
    ]
  }
}
`;

describe("resizeThemeManifestPalettes", () => {
  it("is a no-op when both palettes already match", () => {
    const { source, outcome } = resizeThemeManifestPalettes(
      BASE_MANIFEST,
      4,
      2,
    );
    expect(source).toBe(BASE_MANIFEST);
    expect(outcome.changed).toBe(false);
    expect(outcome.segments).toEqual({ before: 4, after: 4 });
    expect(outcome.rings).toEqual({ before: 2, after: 2 });
  });

  it("grows the segments palette by cycling existing colours", () => {
    const { source, outcome } = resizeThemeManifestPalettes(
      BASE_MANIFEST,
      7,
      2,
    );
    expect(outcome.changed).toBe(true);
    expect(outcome.segments).toEqual({ before: 4, after: 7 });

    const parsed = parseJsonc(source) as {
      radar: { segments: Array<{ light: string }>; rings: unknown[] };
    };
    expect(parsed.radar.segments).toHaveLength(7);
    expect(parsed.radar.segments.map((c) => c.light)).toEqual([
      "#A",
      "#B",
      "#C",
      "#D",
      "#A",
      "#B",
      "#C",
    ]);
    expect(parsed.radar.rings).toHaveLength(2);
  });

  it("shrinks the segments palette by truncation", () => {
    const { source, outcome } = resizeThemeManifestPalettes(
      BASE_MANIFEST,
      2,
      2,
    );
    expect(outcome.changed).toBe(true);
    expect(outcome.segments).toEqual({ before: 4, after: 2 });

    const parsed = parseJsonc(source) as {
      radar: { segments: Array<{ light: string }> };
    };
    expect(parsed.radar.segments.map((c) => c.light)).toEqual(["#A", "#B"]);
  });

  it("grows both palettes independently in one pass", () => {
    const { source, outcome } = resizeThemeManifestPalettes(
      BASE_MANIFEST,
      5,
      6,
    );
    expect(outcome.changed).toBe(true);

    const parsed = parseJsonc(source) as {
      radar: {
        segments: Array<{ light: string }>;
        rings: Array<{ light: string }>;
      };
    };
    expect(parsed.radar.segments.map((c) => c.light)).toEqual([
      "#A",
      "#B",
      "#C",
      "#D",
      "#A",
    ]);
    expect(parsed.radar.rings.map((c) => c.light)).toEqual([
      "#R1",
      "#R2",
      "#R1",
      "#R2",
      "#R1",
      "#R2",
    ]);
  });

  it("preserves leading comments", () => {
    const { source } = resizeThemeManifestPalettes(BASE_MANIFEST, 5, 5);
    expect(source).toContain("// Annotated manifest");
  });

  it("preserves unrelated fields untouched", () => {
    const { source } = resizeThemeManifestPalettes(BASE_MANIFEST, 5, 5);
    const parsed = parseJsonc(source) as {
      label: string;
      supports: string[];
      cssVariables: { foreground: { light: string } };
    };
    expect(parsed.label).toBe("Test");
    expect(parsed.supports).toEqual(["light", "dark"]);
    expect(parsed.cssVariables.foreground.light).toBe("#111");
  });

  it("rejects counts below 1", () => {
    expect(() => resizeThemeManifestPalettes(BASE_MANIFEST, 0, 1)).toThrow(
      /counts must be >= 1/,
    );
    expect(() => resizeThemeManifestPalettes(BASE_MANIFEST, 1, 0)).toThrow(
      /counts must be >= 1/,
    );
  });

  it("rejects manifests with no radar object", () => {
    expect(() => resizeThemeManifestPalettes(`{ "label": "x" }`, 4, 4)).toThrow(
      /no `radar` object/,
    );
  });

  it("rejects manifests where segments/rings are not arrays", () => {
    const bad = `{ "radar": { "segments": "nope", "rings": [{"light":"#1","dark":"#1"}] } }`;
    expect(() => resizeThemeManifestPalettes(bad, 4, 4)).toThrow(
      /must be arrays/,
    );
  });

  it("rejects manifests with an empty source palette", () => {
    const bad = `{ "radar": { "segments": [], "rings": [{"light":"#1","dark":"#1"}] } }`;
    expect(() => resizeThemeManifestPalettes(bad, 4, 4)).toThrow(
      /source palette is empty/,
    );
  });

  it("propagates JSONC parse errors", () => {
    expect(() => resizeThemeManifestPalettes("{ not json", 4, 4)).toThrow(
      /JSONC parse error/,
    );
  });
});

describe("resizeThemeManifestFile", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "resize-theme-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes the file when changed and reports the outcome", () => {
    const file = path.join(dir, "manifest.jsonc");
    writeFileSync(file, BASE_MANIFEST);
    const outcome = resizeThemeManifestFile(file, 5, 3);
    expect(outcome.changed).toBe(true);
    const written = readFileSync(file, "utf8");
    expect(written).not.toBe(BASE_MANIFEST);
    const parsed = parseJsonc(written) as {
      radar: { segments: unknown[]; rings: unknown[] };
    };
    expect(parsed.radar.segments).toHaveLength(5);
    expect(parsed.radar.rings).toHaveLength(3);
  });

  it("does not touch the file when no resize is needed", () => {
    const file = path.join(dir, "manifest.jsonc");
    writeFileSync(file, BASE_MANIFEST);
    const before = readFileSync(file, "utf8");
    const outcome = resizeThemeManifestFile(file, 4, 2);
    expect(outcome.changed).toBe(false);
    expect(readFileSync(file, "utf8")).toBe(before);
  });
});
