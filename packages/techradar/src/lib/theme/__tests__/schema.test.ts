import { describe, expect, it } from "vitest";
import {
  paletteAt,
  resolveTheme,
  ringColorVar,
  segmentColorVar,
  segmentForegroundVar,
  ThemeJsonSchema,
  type ThemeManifest,
} from "../schema";

const dualModeTheme = {
  label: "Porsche",
  supports: ["light", "dark"],
  default: "dark",
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
  background: {
    image: { dark: "background-dark.jpg" },
    opacity: { light: 0, dark: 0.06 },
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

describe("ThemeJsonSchema", () => {
  it("accepts a valid dual-mode theme", () => {
    expect(ThemeJsonSchema.safeParse(dualModeTheme).success).toBe(true);
  });

  it("accepts a valid single-mode theme", () => {
    const singleModeTheme = {
      ...dualModeTheme,
      supports: ["dark"],
      cssVariables: Object.fromEntries(
        Object.entries(dualModeTheme.cssVariables).map(([key, value]) => [
          key,
          typeof value === "object" && value !== null ? value.dark : value,
        ]),
      ),
      background: {
        image: "background-dark.jpg",
        opacity: 0.06,
      },
      radar: {
        segments: dualModeTheme.radar.segments.map((entry) => entry.dark),
        rings: dualModeTheme.radar.rings.map((entry) => entry.dark),
      },
    };

    expect(ThemeJsonSchema.safeParse(singleModeTheme).success).toBe(true);
  });

  it("rejects defaults not present in supports", () => {
    const result = ThemeJsonSchema.safeParse({
      ...dualModeTheme,
      supports: ["light"],
      default: "dark",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "default must be included in supports",
      );
    }
  });

  it("rejects missing per-mode values for supported modes", () => {
    const result = ThemeJsonSchema.safeParse({
      ...dualModeTheme,
      cssVariables: {
        ...dualModeTheme.cssVariables,
        link: { dark: "#88B5FF" },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Missing light value for supported mode",
      );
    }
  });

  it("rejects legacy colorScheme schema", () => {
    const result = ThemeJsonSchema.safeParse({
      label: "Legacy",
      colorScheme: "light",
      cssVariables: dualModeTheme.cssVariables,
      radar: dualModeTheme.radar,
    });

    expect(result.success).toBe(false);
  });

  it("resolves a theme into mode-specific runtime values", () => {
    const theme = {
      ...ThemeJsonSchema.parse(dualModeTheme),
      id: "porsche",
      assetsResolved: {
        image: { dark: "/themes/porsche/background-dark.jpg" },
        headerLogo: {
          light: "/themes/porsche/header-light.svg",
          dark: "/themes/porsche/header-dark.svg",
        },
      },
    } satisfies ThemeManifest;

    const resolved = resolveTheme(theme, "light");

    expect(resolved.cssVariables.link).toBe("#0047FF");
    expect(resolved.assetsResolved.headerLogo).toBe(
      "/themes/porsche/header-light.svg",
    );
    expect(resolved.background?.opacity).toBe(0);
  });
});

describe("segmentColorVar / ringColorVar", () => {
  it("formats 1-indexed CSS var references", () => {
    expect(segmentColorVar(0)).toBe("var(--rtk-segment-1)");
    expect(segmentColorVar(3)).toBe("var(--rtk-segment-4)");
    expect(ringColorVar(0)).toBe("var(--rtk-ring-1)");
    expect(ringColorVar(2)).toBe("var(--rtk-ring-3)");
  });

  it("formats 1-indexed CSS var refs for segment foreground colors", () => {
    expect(segmentForegroundVar(0)).toBe("var(--rtk-segment-1-fg)");
    expect(segmentForegroundVar(3)).toBe("var(--rtk-segment-4-fg)");
  });
});

describe("resolveTheme radar palette", () => {
  // Regression: SSR/CSR hydration mismatch on radar fills + segment swatches.
  it("returns the same mode-agnostic var() refs in both modes", () => {
    const theme = {
      ...ThemeJsonSchema.parse(dualModeTheme),
      id: "porsche",
      assetsResolved: {},
    } satisfies ThemeManifest;

    const light = resolveTheme(theme, "light");
    const dark = resolveTheme(theme, "dark");

    expect(light.radar.segments).toEqual(dark.radar.segments);
    expect(light.radar.rings).toEqual(dark.radar.rings);
    expect(light.radar.segments[0]).toBe("var(--rtk-segment-1)");
    expect(light.radar.rings[0]).toBe("var(--rtk-ring-1)");
    expect(light.radar.segments).toHaveLength(4);
  });
});

describe("paletteAt", () => {
  it("returns the element at the given index when within range", () => {
    expect(paletteAt(["a", "b", "c", "d"], 0)).toBe("a");
    expect(paletteAt(["a", "b", "c", "d"], 3)).toBe("d");
  });

  it("cycles back to the start when the index exceeds palette length", () => {
    expect(paletteAt(["a", "b", "c", "d"], 4)).toBe("a");
    expect(paletteAt(["a", "b", "c", "d"], 5)).toBe("b");
    expect(paletteAt(["a", "b", "c", "d"], 9)).toBe("b");
  });

  it("works for single-element palettes", () => {
    expect(paletteAt(["only"], 0)).toBe("only");
    expect(paletteAt(["only"], 42)).toBe("only");
  });

  it("throws when the palette is empty", () => {
    expect(() => paletteAt([], 0)).toThrow();
  });
});

describe("resolveTheme palette extension", () => {
  it("extends segment/ring arrays when paletteCounts exceed manifest length", () => {
    const theme = {
      ...ThemeJsonSchema.parse(dualModeTheme),
      id: "porsche",
      assetsResolved: {},
    } satisfies ThemeManifest;

    const resolved = resolveTheme(theme, "light", { segments: 6, rings: 5 });

    expect(resolved.radar.segments).toHaveLength(6);
    expect(resolved.radar.rings).toHaveLength(5);
    expect(resolved.radar.segments[4]).toBe("var(--rtk-segment-5)");
    expect(resolved.radar.segments[5]).toBe("var(--rtk-segment-6)");
    expect(resolved.radar.rings[4]).toBe("var(--rtk-ring-5)");
  });

  it("does not shrink arrays when paletteCounts are smaller than manifest length", () => {
    const theme = {
      ...ThemeJsonSchema.parse(dualModeTheme),
      id: "porsche",
      assetsResolved: {},
    } satisfies ThemeManifest;

    const resolved = resolveTheme(theme, "dark", { segments: 2, rings: 2 });

    expect(resolved.radar.segments).toHaveLength(4);
    expect(resolved.radar.rings).toHaveLength(4);
  });
});
