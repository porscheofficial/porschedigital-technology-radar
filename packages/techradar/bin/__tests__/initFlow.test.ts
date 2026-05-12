import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildConfigJson,
  defaultAnswers,
  generateStarterBlips,
  type InitAnswers,
  type InitContext,
  loadInitContext,
  MINIMAL_RINGS,
  MINIMAL_SEGMENTS,
  parseRingsCsv,
  parseSegmentsCsv,
  STANDARD_RINGS,
  STANDARD_SEGMENTS,
  slugify,
  titleCase,
  todayRelease,
} from "../initFlow";

describe("slugify", () => {
  it("lowercases, trims and replaces whitespace with hyphens", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("collapses runs of separators and strips non-slug characters", () => {
    expect(slugify("Foo / Bar __ Baz!!")).toBe("foo-bar-baz");
  });

  it("returns empty string when nothing remains", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("titleCase", () => {
  it("capitalises hyphenated and underscored words", () => {
    expect(titleCase("my-cool_radar")).toBe("My Cool Radar");
  });

  it("returns empty string for empty input", () => {
    expect(titleCase("")).toBe("");
  });
});

describe("parseRingsCsv", () => {
  it("parses four rings with evenly distributed radii", () => {
    const rings = parseRingsCsv("Adopt, Trial, Assess, Hold");
    expect(rings).toHaveLength(4);
    expect(rings.map((r) => r.id)).toEqual([
      "adopt",
      "trial",
      "assess",
      "hold",
    ]);
    expect(rings.map((r) => r.title)).toEqual([
      "Adopt",
      "Trial",
      "Assess",
      "Hold",
    ]);
    expect(rings[3].radius).toBe(1);
    expect(rings[0].radius).toBeCloseTo(0.25, 5);
  });

  it("supports a single-ring radar (outermost radius = 1)", () => {
    const rings = parseRingsCsv("Adopt");
    expect(rings).toHaveLength(1);
    expect(rings[0].radius).toBe(1);
  });

  it("clamps strokeWidth to a sensible minimum", () => {
    const rings = parseRingsCsv("A, B, C, D, E, F, G");
    for (const r of rings) {
      expect(r.strokeWidth).toBeGreaterThanOrEqual(0.75);
    }
  });

  it("falls back to a stable id when a title slugifies to empty", () => {
    const rings = parseRingsCsv("!!, Trial");
    expect(rings[0].id).toBe("ring-1");
    expect(rings[1].id).toBe("trial");
  });

  it("throws on empty input", () => {
    expect(() => parseRingsCsv("")).toThrow(/at least one ring/i);
    expect(() => parseRingsCsv(" , , ")).toThrow(/at least one ring/i);
  });
});

describe("parseSegmentsCsv", () => {
  it("accepts 2 segments", () => {
    const segs = parseSegmentsCsv("Foo, Bar");
    expect(segs).toHaveLength(2);
    expect(segs.map((s) => s.id)).toEqual(["foo", "bar"]);
  });

  it("accepts 6 segments", () => {
    const segs = parseSegmentsCsv("A, B, C, D, E, F");
    expect(segs).toHaveLength(6);
  });

  it("rejects fewer than 2 segments", () => {
    expect(() => parseSegmentsCsv("Foo")).toThrow(/between 2 and 6/i);
  });

  it("rejects more than 6 segments", () => {
    expect(() => parseSegmentsCsv("A, B, C, D, E, F, G")).toThrow(
      /between 2 and 6/i,
    );
  });
});

describe("loadInitContext", () => {
  let tmp: string;
  let sourceDir: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "techradar-init-"));
    sourceDir = mkdtempSync(join(tmpdir(), "techradar-src-"));
    mkdirSync(join(sourceDir, "data", "themes", "neutral"), {
      recursive: true,
    });
    mkdirSync(join(sourceDir, "data", "themes", "porsche"), {
      recursive: true,
    });
    mkdirSync(join(sourceDir, "data", "themes", ".example"), {
      recursive: true,
    });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it("reports a fresh cwd as not initialized with empty existing data", () => {
    const ctx = loadInitContext({ cwd: tmp, sourceDir, interactive: false });
    expect(ctx.isInitialized).toBe(false);
    expect(ctx.existingTitle).toBeNull();
    expect(ctx.existingRings).toBeNull();
    expect(ctx.existingSegments).toBeNull();
    expect(ctx.existingDefaultTheme).toBeNull();
    expect(ctx.existingThemes).toEqual([]);
    expect(ctx.bundledThemes).toEqual(["neutral", "porsche"]);
    expect(ctx.hasRadarContent).toBe(false);
  });

  it("reads existing config.json values when present", () => {
    writeFileSync(
      join(tmp, "config.json"),
      JSON.stringify({
        defaultTheme: "porsche",
        labels: { title: "My Radar" },
        rings: STANDARD_RINGS,
        segments: STANDARD_SEGMENTS,
      }),
    );
    mkdirSync(join(tmp, "radar", "2024-01-15"), { recursive: true });
    writeFileSync(join(tmp, "radar", "2024-01-15", "foo.md"), "---\n---\n");
    mkdirSync(join(tmp, "themes", "porsche"), { recursive: true });

    const ctx = loadInitContext({ cwd: tmp, sourceDir, interactive: false });
    expect(ctx.isInitialized).toBe(true);
    expect(ctx.existingTitle).toBe("My Radar");
    expect(ctx.existingDefaultTheme).toBe("porsche");
    expect(ctx.existingRings).toHaveLength(4);
    expect(ctx.existingSegments).toHaveLength(4);
    expect(ctx.existingThemes).toEqual(["porsche"]);
    expect(ctx.hasRadarContent).toBe(true);
  });

  it("ignores README.md when detecting radar content", () => {
    mkdirSync(join(tmp, "radar", "2024-01-15"), { recursive: true });
    writeFileSync(join(tmp, "radar", "2024-01-15", "README.md"), "# notes");
    const ctx = loadInitContext({ cwd: tmp, sourceDir, interactive: false });
    expect(ctx.hasRadarContent).toBe(false);
  });

  it("tolerates a malformed config.json without throwing", () => {
    writeFileSync(join(tmp, "config.json"), "{not-json");
    const ctx = loadInitContext({ cwd: tmp, sourceDir, interactive: false });
    expect(ctx.existingTitle).toBeNull();
    expect(ctx.existingRings).toBeNull();
  });
});

describe("defaultAnswers", () => {
  function makeCtx(overrides: Partial<InitContext> = {}): InitContext {
    return {
      cwd: "/tmp/x",
      sourceDir: "/tmp/src",
      isInitialized: false,
      interactive: false,
      existingTitle: null,
      existingSegments: null,
      existingRings: null,
      existingDefaultTheme: null,
      existingThemes: [],
      bundledThemes: ["blueprint", "neutral", "porsche"],
      hasRadarContent: false,
      ...overrides,
    };
  }

  it("derives title from directory name when none is configured", () => {
    const a = defaultAnswers(makeCtx(), "my-radar");
    expect(a.title).toBe("My Radar Tech Radar");
    expect(a.taxonomy).toBe("standard");
    expect(a.rings).toBe(STANDARD_RINGS);
    expect(a.segments).toBe(STANDARD_SEGMENTS);
    expect(a.themes).toEqual(["blueprint", "neutral", "porsche"]);
    expect(a.defaultTheme).toBe("neutral");
    expect(a.examples).toBe(true);
  });

  it("preserves an existing title", () => {
    const a = defaultAnswers(
      makeCtx({ existingTitle: "Existing Radar" }),
      "anything",
    );
    expect(a.title).toBe("Existing Radar");
  });

  it("flips taxonomy to custom when rings or segments already exist", () => {
    const a = defaultAnswers(
      makeCtx({
        existingRings: [STANDARD_RINGS[0]],
        existingSegments: [STANDARD_SEGMENTS[0]],
      }),
      "demo",
    );
    expect(a.taxonomy).toBe("custom");
  });

  it("falls back to the first bundled theme when neutral is absent", () => {
    const a = defaultAnswers(
      makeCtx({ bundledThemes: ["blueprint", "matrix"] }),
      "demo",
    );
    expect(a.defaultTheme).toBe("blueprint");
  });

  it("sets examples=false when radar already has content", () => {
    const a = defaultAnswers(makeCtx({ hasRadarContent: true }), "demo");
    expect(a.examples).toBe(false);
  });
});

describe("buildConfigJson", () => {
  function makeAnswers(overrides: Partial<InitAnswers> = {}): InitAnswers {
    return {
      title: "Demo",
      taxonomy: "standard",
      rings: STANDARD_RINGS,
      segments: STANDARD_SEGMENTS,
      themes: ["neutral"],
      customTheme: null,
      defaultTheme: "neutral",
      examples: true,
      ...overrides,
    };
  }

  it("omits rings/segments for standard taxonomy (delegates to defaults)", () => {
    const cfg = buildConfigJson(makeAnswers());
    expect(cfg).toEqual({
      defaultTheme: "neutral",
      labels: { title: "Demo" },
    });
  });

  it("writes rings/segments for custom taxonomy", () => {
    const cfg = buildConfigJson(
      makeAnswers({
        taxonomy: "custom",
        rings: parseRingsCsv("A, B, C"),
        segments: parseSegmentsCsv("X, Y, Z"),
      }),
    );
    expect(cfg.rings).toHaveLength(3);
    expect(cfg.segments).toHaveLength(3);
  });

  it("writes rings/segments for minimal taxonomy", () => {
    const cfg = buildConfigJson(
      makeAnswers({
        taxonomy: "minimal",
        rings: MINIMAL_RINGS,
        segments: MINIMAL_SEGMENTS,
      }),
    );
    expect(cfg.rings).toEqual(MINIMAL_RINGS);
    expect(cfg.segments).toEqual(MINIMAL_SEGMENTS);
  });
});

describe("generateStarterBlips", () => {
  function makeAnswers(overrides: Partial<InitAnswers> = {}): InitAnswers {
    return {
      title: "Demo",
      taxonomy: "standard",
      rings: STANDARD_RINGS,
      segments: STANDARD_SEGMENTS,
      themes: ["neutral"],
      customTheme: null,
      defaultTheme: "neutral",
      examples: true,
      ...overrides,
    };
  }

  it("emits an empty-radar README when examples=false", () => {
    const files = generateStarterBlips(makeAnswers({ examples: false }));
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("README.md");
    expect(files[0].content).toContain("# Radar entries");
    expect(files[0].content).toContain("adopt | trial | assess | hold");
  });

  it("returns an empty list for standard+examples (caller copies curated)", () => {
    expect(generateStarterBlips(makeAnswers())).toEqual([]);
  });

  it("emits a single welcome blip for minimal+examples", () => {
    const files = generateStarterBlips(
      makeAnswers({
        taxonomy: "minimal",
        rings: MINIMAL_RINGS,
        segments: MINIMAL_SEGMENTS,
      }),
    );
    expect(files).toHaveLength(1);
    expect(files[0].path).toMatch(/^\d{4}-\d{2}-\d{2}\/welcome\.md$/);
    expect(files[0].content).toContain("ring: adopt");
    expect(files[0].content).toContain("segment: all");
  });

  it("emits one blip per segment cycling rings for custom+examples", () => {
    const segs = parseSegmentsCsv("Alpha, Beta, Gamma, Delta, Epsilon");
    const rings = parseRingsCsv("Adopt, Trial");
    const files = generateStarterBlips(
      makeAnswers({ taxonomy: "custom", rings, segments: segs }),
    );
    expect(files).toHaveLength(5);
    const today = todayRelease();
    expect(files[0].path).toBe(`${today}/alpha-example.md`);
    expect(files[0].content).toContain("ring: adopt");
    expect(files[1].content).toContain("ring: trial");
    expect(files[2].content).toContain("ring: adopt");
    expect(files[3].content).toContain("ring: trial");
    expect(files[4].content).toContain("ring: adopt");
  });
});

describe("todayRelease", () => {
  it("returns an ISO date string (YYYY-MM-DD)", () => {
    expect(todayRelease()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
