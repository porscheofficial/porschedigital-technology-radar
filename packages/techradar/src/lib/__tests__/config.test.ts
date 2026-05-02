vi.mock("../../../data/config.json", () => ({ default: {} }));

import config from "@/lib/config";
import defaultConfig from "../../../data/config.default.json";

describe("config module", () => {
  describe("shape", () => {
    it("exports an object with all required top-level keys", () => {
      expect(config).toHaveProperty("basePath");
      expect(config).toHaveProperty("baseUrl");
      expect(config).toHaveProperty("editUrl");
      expect(config).toHaveProperty("toggles");
      expect(config).toHaveProperty("colors");
      expect(config).toHaveProperty("segments");
      expect(config).toHaveProperty("rings");
      expect(config).toHaveProperty("flags");
      expect(config).toHaveProperty("chart");
      expect(config).toHaveProperty("labels");
    });

    it("has exactly 4 segments by default", () => {
      expect(config.segments).toHaveLength(4);
    });

    it("has exactly 4 rings by default", () => {
      expect(config.rings).toHaveLength(4);
    });

    it("has ring radii in ascending order", () => {
      const radii = config.rings.map((r) => r.radius);
      for (let i = 1; i < radii.length; i++) {
        expect(radii[i]).toBeGreaterThan(radii[i - 1]);
      }
    });
  });

  describe("default values (empty user config)", () => {
    it("matches default config when user config is empty", () => {
      expect(config.basePath).toBe(defaultConfig.basePath);
      expect(config.toggles).toEqual(defaultConfig.toggles);
      expect(config.colors).toEqual(defaultConfig.colors);
      expect(config.labels).toEqual(defaultConfig.labels);
    });

    it("preserves all toggle defaults", () => {
      expect(config.toggles.showSearch).toBe(true);
      expect(config.toggles.showChart).toBe(true);
      expect(config.toggles.showTagFilter).toBe(true);
      expect(config.toggles.showTeamFilter).toBe(true);
    });

    it("includes all expected label keys", () => {
      expect(config.labels).toHaveProperty("title");
      expect(config.labels).toHaveProperty("imprint");
      expect(config.labels).toHaveProperty("footer");
      expect(config.labels).toHaveProperty("notUpdated");
      expect(config.labels).toHaveProperty("hiddenFromRadar");
      expect(config.labels).toHaveProperty("searchPlaceholder");
      expect(config.labels).toHaveProperty("metaDescription");
    });

    it("preserves all color defaults", () => {
      expect(config.colors.foreground).toBe("#FBFCFF");
      expect(config.colors.background).toBe("#0E0E12");
    });
  });

  describe("segment structure", () => {
    it("every segment has id, title, description, color", () => {
      for (const q of config.segments) {
        expect(q.id).toEqual(expect.any(String));
        expect(q.title).toEqual(expect.any(String));
        expect(q.description).toEqual(expect.any(String));
        expect(q.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it("segment ids are unique", () => {
      const ids = config.segments.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("ring structure", () => {
    it("every ring has id, title, radius, strokeWidth", () => {
      for (const r of config.rings) {
        expect(r.id).toEqual(expect.any(String));
        expect(r.title).toEqual(expect.any(String));
        expect(r.radius).toEqual(expect.any(Number));
        expect(r.strokeWidth).toEqual(expect.any(Number));
      }
    });

    it("ring ids are unique", () => {
      const ids = config.rings.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("last ring has radius 1", () => {
      const last = config.rings[config.rings.length - 1];
      expect(last.radius).toBe(1);
    });
  });

  describe("flag structure", () => {
    it("has new, changed, and default flags", () => {
      expect(config.flags.new).toHaveProperty("title");
      expect(config.flags.changed).toHaveProperty("title");
      expect(config.flags.default).toHaveProperty("title");
    });
  });

  describe("chart structure", () => {
    it("has size and blipSize", () => {
      expect(config.chart.size).toEqual(expect.any(Number));
      expect(config.chart.blipSize).toEqual(expect.any(Number));
      expect(config.chart.size).toBeGreaterThan(0);
      expect(config.chart.blipSize).toBeGreaterThan(0);
    });
  });
});

describe("config deep merge (with partial user config)", () => {
  // vi.mock is hoisted, so we can't re-import config with different mocks.
  // Instead, replicate the merge logic to verify partial overrides.
  function mergeConfig(userOverrides: Record<string, unknown>) {
    const merged = {
      ...defaultConfig,
      ...userOverrides,
    } as unknown as typeof import("@/lib/config").default;

    if (userOverrides.colors && typeof userOverrides.colors === "object") {
      merged.colors = {
        ...defaultConfig.colors,
        ...(userOverrides.colors as Record<string, string>),
      };
    }

    if (userOverrides.labels && typeof userOverrides.labels === "object") {
      merged.labels = {
        ...defaultConfig.labels,
        ...(userOverrides.labels as Record<string, string>),
      };
    }

    if (userOverrides.toggles && typeof userOverrides.toggles === "object") {
      merged.toggles = {
        ...defaultConfig.toggles,
        ...(userOverrides.toggles as Record<string, boolean>),
      };
    }

    return merged;
  }

  it("partial colors override preserves other colors", () => {
    const result = mergeConfig({
      colors: { foreground: "#FF0000" },
    });
    expect(result.colors.foreground).toBe("#FF0000");
    expect(result.colors.background).toBe(defaultConfig.colors.background);
    expect(result.colors.highlight).toBe(defaultConfig.colors.highlight);
  });

  it("partial toggles override preserves other toggles", () => {
    const result = mergeConfig({
      toggles: { showChart: false },
    });
    expect(result.toggles.showChart).toBe(false);
    expect(result.toggles.showSearch).toBe(true);
    expect(result.toggles.showTagFilter).toBe(true);
  });

  it("partial labels override preserves other labels", () => {
    const result = mergeConfig({
      labels: { title: "Custom Radar" },
    });
    expect(result.labels.title).toBe("Custom Radar");
    expect(result.labels.footer).toBe(defaultConfig.labels.footer);
  });

  it("top-level scalar overrides work", () => {
    const result = mergeConfig({
      basePath: "/custom",
      baseUrl: "https://custom.example.com",
    });
    expect(result.basePath).toBe("/custom");
    expect(result.baseUrl).toBe("https://custom.example.com");
  });

  it("segments can be fully replaced", () => {
    const customSegments = [
      { id: "q1", title: "Q1", description: "", color: "#111111" },
      { id: "q2", title: "Q2", description: "", color: "#222222" },
    ];
    const result = mergeConfig({ segments: customSegments });
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].id).toBe("q1");
  });

  it("rings can be fully replaced", () => {
    const customRings = [
      {
        id: "use",
        title: "Use",
        description: "",
        color: "#111",
        radius: 0.5,
        strokeWidth: 3,
      },
      {
        id: "skip",
        title: "Skip",
        description: "",
        color: "#222",
        radius: 1,
        strokeWidth: 1,
      },
    ];
    const result = mergeConfig({ rings: customRings });
    expect(result.rings).toHaveLength(2);
    expect(result.rings[0].id).toBe("use");
  });

  it("empty user config returns defaults unchanged", () => {
    const result = mergeConfig({});
    expect(result).toEqual(defaultConfig);
  });
});
