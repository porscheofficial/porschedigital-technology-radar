import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectAll,
  detectConfigJson,
  detectFrontmatter,
  detectThemes,
  type Finding,
} from "../migrateDetect";

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function writeText(filePath: string, contents: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf-8");
}

function keys(findings: Finding[]): string[] {
  return findings.map((f) => f.key);
}

describe("migrateDetect", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "techradar-migrate-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  describe("detectConfigJson", () => {
    it("returns no findings when config.json is missing", () => {
      expect(detectConfigJson(cwd)).toEqual([]);
    });

    it("returns no findings on a valid v2 config", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        segments: [{ id: "platforms" }, { id: "languages" }],
        rings: [{ id: "adopt" }, { id: "trial" }],
      });
      expect(detectConfigJson(cwd)).toEqual([]);
    });

    it("flags every legacy root key as error", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        segments: [],
        rings: [],
        colors: { foreground: "#000" },
        backgroundImage: "bg.png",
        backgroundOpacity: 0.5,
      });
      const found = detectConfigJson(cwd);
      expect(keys(found)).toEqual(
        expect.arrayContaining([
          "config.json:colors",
          "config.json:backgroundImage",
          "config.json:backgroundOpacity",
        ]),
      );
      for (const key of [
        "config.json:colors",
        "config.json:backgroundImage",
        "config.json:backgroundOpacity",
      ]) {
        const f = found.find((x) => x.key === key);
        expect(f?.severity).toBe("error");
      }
    });

    it("warns (not errors) on quadrants without segments", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        quadrants: [{ id: "platforms" }],
        rings: [],
      });
      const found = detectConfigJson(cwd);
      const quadrantsFinding = found.find(
        (f) => f.key === "config.json:quadrants",
      );
      expect(quadrantsFinding?.severity).toBe("warn");
    });

    it("does not warn on quadrants when segments is also present", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        quadrants: [{ id: "old" }],
        segments: [{ id: "new" }],
        rings: [],
      });
      const found = detectConfigJson(cwd);
      expect(keys(found)).not.toContain("config.json:quadrants");
    });

    it("flags per-segment colors (under both segments and quadrants alias)", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        quadrants: [{ id: "a", color: "#fff" }, { id: "b" }],
        rings: [],
      });
      const found = detectConfigJson(cwd);
      expect(keys(found)).toContain("config.json:segments[0].color");
      expect(keys(found)).not.toContain("config.json:segments[1].color");
    });

    it("flags per-ring colors", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        segments: [],
        rings: [{ id: "adopt", color: "#0f0" }],
      });
      const found = detectConfigJson(cwd);
      expect(keys(found)).toContain("config.json:rings[0].color");
    });

    it("flags missing defaultTheme as error", () => {
      writeJson(path.join(cwd, "config.json"), {
        segments: [],
        rings: [],
      });
      const found = detectConfigJson(cwd);
      const f = found.find((x) => x.key === "config.json:defaultTheme");
      expect(f?.severity).toBe("error");
    });

    it("flags empty defaultTheme as error", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "   ",
        segments: [],
        rings: [],
      });
      const found = detectConfigJson(cwd);
      expect(keys(found)).toContain("config.json:defaultTheme");
    });

    it("returns a single parse-error finding on broken JSON (does not throw)", () => {
      writeText(path.join(cwd, "config.json"), "{ not json");
      const found = detectConfigJson(cwd);
      expect(found).toHaveLength(1);
      expect(found[0]?.key).toBe("config.json:parse");
      expect(found[0]?.severity).toBe("error");
    });
  });

  describe("detectFrontmatter", () => {
    it("returns no findings when radar/ is missing", () => {
      expect(detectFrontmatter(cwd)).toEqual([]);
    });

    it("warns once per file using legacy quadrant key", () => {
      writeText(
        path.join(cwd, "radar", "2024-01-01", "alpha.md"),
        "---\ntitle: Alpha\nring: adopt\nquadrant: platforms\n---\nbody\n",
      );
      writeText(
        path.join(cwd, "radar", "2024-01-01", "beta.md"),
        "---\ntitle: Beta\nring: adopt\nsegment: platforms\n---\nbody\n",
      );
      const found = detectFrontmatter(cwd);
      expect(found).toHaveLength(1);
      expect(found[0]?.severity).toBe("warn");
      expect(found[0]?.file).toContain("alpha.md");
    });

    it("does not warn when both quadrant and segment are present (segment wins)", () => {
      writeText(
        path.join(cwd, "radar", "x.md"),
        "---\nring: adopt\nquadrant: a\nsegment: a\n---\n",
      );
      expect(detectFrontmatter(cwd)).toEqual([]);
    });

    it("recurses into nested radar subdirectories", () => {
      writeText(
        path.join(cwd, "radar", "2024", "Q1", "deep.md"),
        "---\nring: adopt\nquadrant: a\n---\n",
      );
      const found = detectFrontmatter(cwd);
      expect(found).toHaveLength(1);
      expect(found[0]?.file).toContain(path.join("radar", "2024", "Q1"));
    });
  });

  describe("detectThemes", () => {
    it("returns no findings when themes/ is missing", () => {
      expect(detectThemes(cwd)).toEqual([]);
    });

    it("flags themes with legacy colorScheme as error", () => {
      writeText(
        path.join(cwd, "themes", "legacy", "manifest.jsonc"),
        '{\n  "label": "Legacy",\n  "colorScheme": { "foreground": "#000" }\n}\n',
      );
      const found = detectThemes(cwd);
      expect(found).toHaveLength(1);
      expect(found[0]?.severity).toBe("error");
      expect(found[0]?.key).toContain(":colorScheme");
    });

    it("ignores dot-prefixed theme dirs (.example)", () => {
      writeText(
        path.join(cwd, "themes", ".example", "manifest.jsonc"),
        '{ "colorScheme": { } }\n',
      );
      expect(detectThemes(cwd)).toEqual([]);
    });

    it("returns no findings for a valid v2 manifest", () => {
      writeText(
        path.join(cwd, "themes", "neo", "manifest.jsonc"),
        '{\n  // v2 shape — trailing comma allowed\n  "label": "Neo",\n  "supports": ["light"],\n  "default": "light",\n}\n',
      );
      expect(detectThemes(cwd)).toEqual([]);
    });

    it("emits a parse-error finding for malformed JSONC (does not throw)", () => {
      writeText(
        path.join(cwd, "themes", "broken", "manifest.jsonc"),
        "{ not valid",
      );
      const found = detectThemes(cwd);
      expect(found).toHaveLength(1);
      expect(found[0]?.severity).toBe("error");
      expect(found[0]?.key).toContain(":parse");
    });
  });

  describe("detectAll", () => {
    it("reports clean on a valid v2 project", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        segments: [{ id: "a" }],
        rings: [{ id: "adopt" }],
      });
      const report = detectAll(cwd);
      expect(report.findings).toEqual([]);
      expect(report.hasV1Markers).toBe(false);
      expect(report.hasErrors).toBe(false);
    });

    it("aggregates findings across all three scanners", () => {
      writeJson(path.join(cwd, "config.json"), {
        quadrants: [{ id: "a", color: "#fff" }],
        rings: [{ id: "adopt", color: "#0f0" }],
        colors: {},
      });
      writeText(
        path.join(cwd, "radar", "x.md"),
        "---\nring: adopt\nquadrant: a\n---\n",
      );
      writeText(
        path.join(cwd, "themes", "legacy", "manifest.jsonc"),
        '{ "colorScheme": {} }\n',
      );
      const report = detectAll(cwd);
      expect(report.hasErrors).toBe(true);
      expect(report.hasV1Markers).toBe(true);
      expect(report.findings.some((f) => f.file === "config.json")).toBe(true);
      expect(report.findings.some((f) => f.file.endsWith("x.md"))).toBe(true);
      expect(
        report.findings.some((f) => f.file.includes("manifest.jsonc")),
      ).toBe(true);
    });

    it("hasErrors is false when only soft warns are present", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        quadrants: [{ id: "a" }],
        rings: [{ id: "adopt" }],
      });
      const report = detectAll(cwd);
      expect(report.hasV1Markers).toBe(true);
      expect(report.hasErrors).toBe(false);
    });
  });
});
