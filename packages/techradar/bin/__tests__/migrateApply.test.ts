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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyMechanicalRenames } from "../migrateApply";

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function writeText(filePath: string, contents: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf-8");
}

describe("migrateApply", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "techradar-apply-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  describe("config.json rename", () => {
    it("renames quadrants → segments and preserves key order", () => {
      writeJson(path.join(cwd, "config.json"), {
        title: "My Radar",
        defaultTheme: "porsche",
        quadrants: [{ id: "tools", name: "Tools" }],
        rings: [{ id: "adopt", name: "Adopt" }],
        labels: { footer: "x" },
      });

      const result = applyMechanicalRenames({ cwd });

      expect(result.changes.map((c) => c.file)).toContain("config.json");
      expect(result.errors).toEqual([]);
      const after = JSON.parse(
        readFileSync(path.join(cwd, "config.json"), "utf-8"),
      );
      expect(after).not.toHaveProperty("quadrants");
      expect(after.segments).toEqual([{ id: "tools", name: "Tools" }]);
      expect(Object.keys(after)).toEqual([
        "title",
        "defaultTheme",
        "segments",
        "rings",
        "labels",
      ]);
    });

    it("does nothing when config.json is missing", () => {
      const result = applyMechanicalRenames({ cwd });
      expect(result.changes).toEqual([]);
      expect(result.backupDir).toBeNull();
    });

    it("skips when both quadrants and segments coexist (ambiguous)", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        quadrants: [{ id: "old" }],
        segments: [{ id: "new" }],
      });

      const result = applyMechanicalRenames({ cwd });
      expect(result.changes.map((c) => c.file)).not.toContain("config.json");
      const after = JSON.parse(
        readFileSync(path.join(cwd, "config.json"), "utf-8"),
      );
      expect(after).toHaveProperty("quadrants");
      expect(after).toHaveProperty("segments");
    });

    it("skips when config.json is unparseable (detector reports it)", () => {
      writeText(path.join(cwd, "config.json"), "{ not: json,");
      const result = applyMechanicalRenames({ cwd });
      expect(result.changes).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("does not rename when only segments is present (already v2)", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        segments: [{ id: "tools" }],
      });
      const result = applyMechanicalRenames({ cwd });
      expect(result.changes).toEqual([]);
    });
  });

  describe("frontmatter rename", () => {
    it("renames quadrant: → segment: in frontmatter only", () => {
      const md = path.join(cwd, "radar", "2024-01", "blip.md");
      writeText(
        md,
        "---\ntitle: Foo\nring: adopt\nquadrant: tools\n---\n\nBody mentioning quadrant: should not change.\n",
      );

      const result = applyMechanicalRenames({ cwd });

      expect(result.errors).toEqual([]);
      expect(result.changes.map((c) => c.file)).toContain(
        path.join("radar", "2024-01", "blip.md"),
      );
      const after = readFileSync(md, "utf-8");
      expect(after).toContain("segment: tools");
      expect(after).not.toMatch(/^quadrant:/m);
      expect(after).toContain("Body mentioning quadrant: should not change.");
    });

    it("walks subdirectories recursively", () => {
      const a = path.join(cwd, "radar", "a", "x.md");
      const b = path.join(cwd, "radar", "b", "y.md");
      writeText(a, "---\nquadrant: tools\nring: adopt\n---\nA\n");
      writeText(b, "---\nquadrant: data\nring: trial\n---\nB\n");

      const result = applyMechanicalRenames({ cwd });
      expect(result.changes).toHaveLength(2);
      expect(readFileSync(a, "utf-8")).toContain("segment: tools");
      expect(readFileSync(b, "utf-8")).toContain("segment: data");
    });

    it("skips files that already have segment: alongside quadrant:", () => {
      const md = path.join(cwd, "radar", "blip.md");
      writeText(
        md,
        "---\nquadrant: old\nsegment: new\nring: adopt\n---\nBody\n",
      );

      const result = applyMechanicalRenames({ cwd });
      expect(result.changes).toEqual([]);
      expect(readFileSync(md, "utf-8")).toContain("quadrant: old");
    });

    it("skips files without a frontmatter fence", () => {
      const md = path.join(cwd, "radar", "no-fm.md");
      writeText(md, "# heading only, quadrant: nope\n");
      const result = applyMechanicalRenames({ cwd });
      expect(result.changes).toEqual([]);
    });

    it("does nothing when radar/ is missing", () => {
      const result = applyMechanicalRenames({ cwd });
      expect(result.changes).toEqual([]);
    });
  });

  describe("backup", () => {
    it("snapshots every modified file under .techradar-migrate-backup/<ts>/", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        quadrants: [{ id: "tools" }],
      });
      const md = path.join(cwd, "radar", "2024-01", "blip.md");
      writeText(md, "---\nquadrant: tools\nring: adopt\n---\nBody\n");

      const result = applyMechanicalRenames({ cwd });
      expect(result.backupDir).not.toBeNull();
      const backupAbs = path.join(cwd, result.backupDir as string);
      expect(existsSync(path.join(backupAbs, "config.json"))).toBe(true);
      expect(
        existsSync(path.join(backupAbs, "radar", "2024-01", "blip.md")),
      ).toBe(true);

      const restoredConfig = JSON.parse(
        readFileSync(path.join(backupAbs, "config.json"), "utf-8"),
      );
      expect(restoredConfig).toHaveProperty("quadrants");
      expect(restoredConfig).not.toHaveProperty("segments");

      const restoredMd = readFileSync(
        path.join(backupAbs, "radar", "2024-01", "blip.md"),
        "utf-8",
      );
      expect(restoredMd).toContain("quadrant: tools");
    });

    it("does not create a backup directory when there is nothing to change", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        segments: [{ id: "tools" }],
      });
      const result = applyMechanicalRenames({ cwd });
      expect(result.backupDir).toBeNull();
      expect(existsSync(path.join(cwd, ".techradar-migrate-backup"))).toBe(
        false,
      );
    });
  });

  describe("dry-run (write: false)", () => {
    it("returns ChangeRecords without writing or backing up", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        quadrants: [{ id: "tools" }],
      });
      const md = path.join(cwd, "radar", "blip.md");
      writeText(md, "---\nquadrant: tools\nring: adopt\n---\nBody\n");

      const result = applyMechanicalRenames({ cwd, write: false });
      expect(result.changes).toHaveLength(2);
      expect(result.backupDir).toBeNull();

      const cfg = JSON.parse(
        readFileSync(path.join(cwd, "config.json"), "utf-8"),
      );
      expect(cfg).toHaveProperty("quadrants");
      expect(cfg).not.toHaveProperty("segments");
      expect(readFileSync(md, "utf-8")).toContain("quadrant: tools");
      expect(existsSync(path.join(cwd, ".techradar-migrate-backup"))).toBe(
        false,
      );
    });
  });

  describe("orchestrator combined", () => {
    it("applies config + frontmatter changes and reports all of them", () => {
      writeJson(path.join(cwd, "config.json"), {
        defaultTheme: "porsche",
        quadrants: [{ id: "tools" }],
      });
      const md1 = path.join(cwd, "radar", "a.md");
      const md2 = path.join(cwd, "radar", "sub", "b.md");
      writeText(md1, "---\nquadrant: tools\nring: adopt\n---\nA\n");
      writeText(md2, "---\nquadrant: data\nring: trial\n---\nB\n");

      const result = applyMechanicalRenames({ cwd });
      expect(result.changes).toHaveLength(3);
      expect(result.errors).toEqual([]);
      expect(result.backupDir).not.toBeNull();

      const backupContents = readdirSync(
        path.join(cwd, result.backupDir as string),
      );
      expect(backupContents).toContain("config.json");
      expect(backupContents).toContain("radar");
    });
  });
});
