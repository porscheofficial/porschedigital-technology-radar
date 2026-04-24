import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { consola } from "consola";

async function importValidateFrontmatterModule() {
  return import("../validateFrontmatter");
}

function mockSegmentConfig() {
  vi.doMock("../../data/config.json", () => ({
    default: {
      segments: [
        {
          id: "languages-and-frameworks",
          title: "Languages & Frameworks",
          description: "Config used by validateFrontmatter tests.",
          color: "#4A9E7E",
        },
        {
          id: "methods-and-patterns",
          title: "Methods & Patterns",
          description: "Second valid test segment.",
          color: "#5B8DB8",
        },
      ],
    },
  }));
}

// ---------------------------------------------------------------------------
// FrontmatterSchema
// ---------------------------------------------------------------------------

describe("FrontmatterSchema", () => {
  const validData = {
    ring: "adopt",
    segment: "languages-and-frameworks",
  };

  beforeEach(() => {
    vi.resetModules();
    mockSegmentConfig();
  });

  afterEach(() => {
    vi.doUnmock("../../data/config.json");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("accepts minimal valid frontmatter", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
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

  it("accepts full valid frontmatter", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
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

  it("rejects missing ring", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
    const result = FrontmatterSchema.safeParse({
      segment: "languages-and-frameworks",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing segment", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
    const result = FrontmatterSchema.safeParse({ ring: "adopt" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ring value", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
    const result = FrontmatterSchema.safeParse({
      ring: "invalid-ring",
      segment: "languages-and-frameworks",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid segment value", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
    const result = FrontmatterSchema.safeParse({
      ring: "adopt",
      segment: "invalid-segment",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean featured", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
    const result = FrontmatterSchema.safeParse({
      ...validData,
      featured: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array tags", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
    const result = FrontmatterSchema.safeParse({
      ...validData,
      tags: "not-an-array",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array teams", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
    const result = FrontmatterSchema.safeParse({
      ...validData,
      teams: "not-an-array",
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults for optional fields", async () => {
    const { FrontmatterSchema } = await importValidateFrontmatterModule();
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
    vi.resetModules();
    mockSegmentConfig();
    vi.spyOn(consola, "warn").mockImplementation(() => undefined);
    vi.spyOn(consola, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.doUnmock("../../data/config.json");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe("backward compatibility shim (ADR-0025)", () => {
    it("existing radar markdown with only quadrant frontmatter continues to parse as segment", async () => {
      const { parseRadarFrontmatter } = await importValidateFrontmatterModule();
      const data = { ring: "adopt", quadrant: "languages-and-frameworks" };
      const result = parseRadarFrontmatter(data, "legacy.md");

      expect(result).not.toBeNull();
      expect(result?.segment).toBe("languages-and-frameworks");
      expect(data).toEqual({
        ring: "adopt",
        segment: "languages-and-frameworks",
      });
      expect(result && "quadrant" in result).toBe(false);
      expect(consola.warn).toHaveBeenCalledTimes(1);
      expect(consola.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          '[deprecated] frontmatter key "quadrant" is renamed to "segment" in legacy.md.',
        ),
      );
    });

    it("current radar markdown using segment frontmatter does not get a deprecation warning", async () => {
      const { parseRadarFrontmatter } = await importValidateFrontmatterModule();
      const data = { ring: "adopt", segment: "languages-and-frameworks" };
      const result = parseRadarFrontmatter(data, "modern.md");

      expect(result).not.toBeNull();
      expect(result?.segment).toBe("languages-and-frameworks");
      expect(consola.warn).not.toHaveBeenCalled();
    });

    it("migrated segment frontmatter is not clobbered by legacy quadrant when both keys are present", async () => {
      const { parseRadarFrontmatter } = await importValidateFrontmatterModule();
      const data = {
        ring: "adopt",
        segment: "languages-and-frameworks",
        quadrant: "ignored-legacy-value",
      };
      const result = parseRadarFrontmatter(data, "mixed.md");

      expect(result).not.toBeNull();
      expect(result?.segment).toBe("languages-and-frameworks");
      expect(data).toEqual({
        ring: "adopt",
        segment: "languages-and-frameworks",
        quadrant: "ignored-legacy-value",
      });
      expect(consola.warn).not.toHaveBeenCalled();
    });
  });

  it("returns parsed data for valid frontmatter", async () => {
    const { parseRadarFrontmatter } = await importValidateFrontmatterModule();
    const result = parseRadarFrontmatter(
      { ring: "adopt", segment: "languages-and-frameworks" },
      "test.md",
    );
    expect(result).not.toBeNull();
    expect(result?.ring).toBe("adopt");
  });

  it("returns null for invalid frontmatter", async () => {
    const { parseRadarFrontmatter } = await importValidateFrontmatterModule();
    const result = parseRadarFrontmatter({ ring: "bad" }, "test.md");
    expect(result).toBeNull();
  });

  it("returns null for empty data", async () => {
    const { parseRadarFrontmatter } = await importValidateFrontmatterModule();
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
    vi.resetModules();
    mockSegmentConfig();
    vi.spyOn(consola, "warn").mockImplementation(() => undefined);
    vi.spyOn(consola, "error").mockImplementation(() => undefined);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-test-"));
  });

  afterEach(() => {
    vi.doUnmock("../../data/config.json");
    vi.resetModules();
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFile(relativePath: string, content: string) {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  it("returns 0 errors for valid files", async () => {
    const { validateRadarFiles } = await importValidateFrontmatterModule();
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

  it("counts errors for invalid files", async () => {
    const { validateRadarFiles } = await importValidateFrontmatterModule();
    writeFile(
      "valid.md",
      "---\nring: adopt\nsegment: languages-and-frameworks\n---\nOK",
    );
    writeFile("invalid.md", "---\nring: bad-ring\n---\nBroken");
    expect(validateRadarFiles(tmpDir)).toBe(1);
  });

  it("returns 0 for empty directory", async () => {
    const { validateRadarFiles } = await importValidateFrontmatterModule();
    expect(validateRadarFiles(tmpDir)).toBe(0);
  });

  it("traverses nested directories", async () => {
    const { validateRadarFiles } = await importValidateFrontmatterModule();
    writeFile(
      "2024-01/item.md",
      "---\nring: adopt\nsegment: languages-and-frameworks\n---\nNested",
    );
    writeFile("2024-02/bad.md", "---\ntitle: missing fields\n---\nBad");
    expect(validateRadarFiles(tmpDir)).toBe(1);
  });

  it("ignores non-markdown files", async () => {
    const { validateRadarFiles } = await importValidateFrontmatterModule();
    writeFile("readme.txt", "not markdown");
    writeFile(
      "item.md",
      "---\nring: adopt\nsegment: languages-and-frameworks\n---\nOK",
    );
    expect(validateRadarFiles(tmpDir)).toBe(0);
  });
});
