import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { consola } from "consola";
import {
  FrontmatterSchema,
  parseRadarFrontmatter,
  validateRadarFiles,
} from "../validateFrontmatter";

vi.mock("consola", () => ({
  consola: {
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    start: vi.fn(),
    fatal: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// FrontmatterSchema
// ---------------------------------------------------------------------------

describe("FrontmatterSchema", () => {
  const validData = {
    ring: "adopt",
    segment: "languages-and-frameworks",
  };

  it("accepts minimal valid frontmatter", () => {
    const result = FrontmatterSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ring).toBe("adopt");
      expect(result.data.segment).toBe("languages-and-frameworks");
      expect(result.data.featured).toBe(true);
      expect(result.data.tags).toEqual([]);
      expect(result.data.teams).toEqual([]);
    }
  });

  it("accepts full valid frontmatter", () => {
    const result = FrontmatterSchema.safeParse({
      ...validData,
      title: "TypeScript",
      summary: "Type-safe JavaScript",
      ogImage: "/images/typescript-card.png",
      featured: false,
      tags: ["language"],
      teams: ["platform"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("TypeScript");
      expect(result.data.summary).toBe("Type-safe JavaScript");
      expect(result.data.ogImage).toBe("/images/typescript-card.png");
      expect(result.data.featured).toBe(false);
      expect(result.data.tags).toEqual(["language"]);
      expect(result.data.teams).toEqual(["platform"]);
    }
  });

  it("rejects missing ring", () => {
    const result = FrontmatterSchema.safeParse({
      segment: "languages-and-frameworks",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing segment", () => {
    const result = FrontmatterSchema.safeParse({ ring: "adopt" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ring value", () => {
    const result = FrontmatterSchema.safeParse({
      ring: "invalid-ring",
      segment: "languages-and-frameworks",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid segment value", () => {
    const result = FrontmatterSchema.safeParse({
      ring: "adopt",
      segment: "invalid-segment",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean featured", () => {
    const result = FrontmatterSchema.safeParse({
      ...validData,
      featured: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array tags", () => {
    const result = FrontmatterSchema.safeParse({
      ...validData,
      tags: "not-an-array",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array teams", () => {
    const result = FrontmatterSchema.safeParse({
      ...validData,
      teams: "not-an-array",
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults for optional fields", () => {
    const result = FrontmatterSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.featured).toBe(true);
      expect(result.data.tags).toEqual([]);
      expect(result.data.teams).toEqual([]);
      expect(result.data.title).toBeUndefined();
      expect(result.data.summary).toBeUndefined();
      expect(result.data.ogImage).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// parseRadarFrontmatter
// ---------------------------------------------------------------------------

describe("parseRadarFrontmatter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("backward compatibility shim (ADR-0025)", () => {
    it("renames quadrant to segment and warns", () => {
      const data = { ring: "adopt", quadrant: "languages-and-frameworks" };
      const result = parseRadarFrontmatter(data, "legacy.md");

      expect(result).not.toBeNull();
      expect(result?.segment).toBe("languages-and-frameworks");
      expect((result as any)?.quadrant).toBeUndefined();
      expect(consola.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          '[deprecated] frontmatter key "quadrant" is renamed to "segment" in legacy.md.',
        ),
      );
    });

    it("does not warn when only segment is provided", () => {
      const data = { ring: "adopt", segment: "languages-and-frameworks" };
      const result = parseRadarFrontmatter(data, "modern.md");

      expect(result).not.toBeNull();
      expect(result?.segment).toBe("languages-and-frameworks");
      expect(consola.warn).not.toHaveBeenCalled();
    });

    it("prefers segment when both are provided and does not warn", () => {
      const data = {
        ring: "adopt",
        segment: "languages-and-frameworks",
        quadrant: "ignored-legacy-value",
      };
      const result = parseRadarFrontmatter(data, "mixed.md");

      expect(result).not.toBeNull();
      expect(result?.segment).toBe("languages-and-frameworks");
      expect(consola.warn).not.toHaveBeenCalled();
    });
  });

  it("returns parsed data for valid frontmatter", () => {
    const result = parseRadarFrontmatter(
      { ring: "adopt", segment: "languages-and-frameworks" },
      "test.md",
    );
    expect(result).not.toBeNull();
    expect(result?.ring).toBe("adopt");
  });

  it("returns null for invalid frontmatter", () => {
    const result = parseRadarFrontmatter({ ring: "bad" }, "test.md");
    expect(result).toBeNull();
  });

  it("returns null for empty data", () => {
    const result = parseRadarFrontmatter({}, "test.md");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateRadarFiles
// ---------------------------------------------------------------------------

describe("validateRadarFiles", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFile(relativePath: string, content: string) {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  it("returns 0 errors for valid files", () => {
    writeFile(
      "item-a.md",
      "---\nring: adopt\nsegment: languages-and-frameworks\n---\nContent",
    );
    writeFile(
      "item-b.md",
      "---\nring: trial\nsegment: methods-and-patterns\n---\nContent",
    );
    expect(validateRadarFiles(tmpDir)).toBe(0);
  });

  it("counts errors for invalid files", () => {
    writeFile(
      "valid.md",
      "---\nring: adopt\nsegment: languages-and-frameworks\n---\nOK",
    );
    writeFile("invalid.md", "---\nring: bad-ring\n---\nBroken");
    expect(validateRadarFiles(tmpDir)).toBe(1);
  });

  it("returns 0 for empty directory", () => {
    expect(validateRadarFiles(tmpDir)).toBe(0);
  });

  it("traverses nested directories", () => {
    writeFile(
      "2024-01/item.md",
      "---\nring: adopt\nsegment: languages-and-frameworks\n---\nNested",
    );
    writeFile("2024-02/bad.md", "---\ntitle: missing fields\n---\nBad");
    expect(validateRadarFiles(tmpDir)).toBe(1);
  });

  it("ignores non-markdown files", () => {
    writeFile("readme.txt", "not markdown");
    writeFile(
      "item.md",
      "---\nring: adopt\nsegment: languages-and-frameworks\n---\nOK",
    );
    expect(validateRadarFiles(tmpDir)).toBe(0);
  });
});
