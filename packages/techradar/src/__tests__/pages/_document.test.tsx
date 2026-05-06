import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ThemeManifest } from "@/lib/theme/schema";
import {
  buildThemeStyleBlock,
  getDefaultMode,
  getSchemeClassForMode,
} from "@/pages/_document";

const dualModeTheme: ThemeManifest = {
  id: "porsche",
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
  chips: {
    status: { light: "#6B6D70", dark: "#88898C" },
    tag: { light: "#2762EC", dark: "#178BFF" },
    team: { light: "#C45A00", dark: "#FF8A3C" },
    "team-added": { light: "#1B7C3D", dark: "#22A04E" },
    "team-removed": { light: "#B8302A", dark: "#D14037" },
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
  assetsResolved: {
    image: { dark: "/themes/porsche/background-dark.jpg" },
  },
};

describe("buildThemeStyleBlock", () => {
  it("emits per-theme light-dark css variables for dual-mode themes", () => {
    const css = buildThemeStyleBlock([dualModeTheme]);
    expect(css).toContain(':root[data-theme="porsche"]');
    expect(css).toContain("--link: light-dark(#0047FF, #88B5FF)");
  });

  it("emits concrete values for single-mode themes", () => {
    const css = buildThemeStyleBlock([
      {
        ...dualModeTheme,
        id: "acme",
        label: "Acme",
        supports: ["dark"],
        cssVariables: {
          ...dualModeTheme.cssVariables,
          link: "#88B5FF",
        },
        background: undefined,
      },
    ]);

    expect(css).toContain("--link: #88B5FF");
    expect(css).not.toContain("light-dark(#88B5FF");
  });

  // Regression: SSR/CSR hydration mismatch on radar fills + MobileSegmentNav swatches.
  it("emits --rtk-segment-N and --rtk-ring-N light-dark vars per theme", () => {
    const css = buildThemeStyleBlock([dualModeTheme]);
    expect(css).toContain("--rtk-segment-1: light-dark(#4A9E7E, #7EC9AA)");
    expect(css).toContain("--rtk-segment-4: light-dark(#B85B5B, #DA8A8A)");
    expect(css).toContain("--rtk-ring-1: light-dark(#4A9E7E, #7EC9AA)");
    expect(css).toContain("--rtk-ring-4: light-dark(#B85B5B, #DA8A8A)");
  });

  // Regression: dark-only background image was emitted with light-dark(), which
  // CSS rejects (light-dark accepts <color> only) → the whole `background`
  // shorthand on body::before fell back to none and the image disappeared.
  it("emits per-scheme rules for background image and opacity", () => {
    const css = buildThemeStyleBlock([dualModeTheme]);
    expect(css).toContain(
      ':root.scheme-light[data-theme="porsche"] { --background-image: none; --background-opacity: 0 }',
    );
    expect(css).toContain(
      ':root.scheme-dark[data-theme="porsche"] { --background-image: url("/themes/porsche/background-dark.jpg"); --background-opacity: 0.06 }',
    );
    expect(css).toContain(
      ':root.scheme-light-dark[data-theme="porsche"] { --background-image: none; --background-opacity: 0 }',
    );
    expect(css).toContain(
      '@media (prefers-color-scheme: dark) { :root.scheme-light-dark[data-theme="porsche"] { --background-image: url("/themes/porsche/background-dark.jpg"); --background-opacity: 0.06 } }',
    );
    expect(css).not.toContain("light-dark(none");
    expect(css).not.toContain("light-dark(url(");
  });

  // Regression: tooltip text on radar blips fell back to dark ink because
  // --tooltip-fg was computed at runtime from a CSS var() string that
  // readableTextOn() couldn't parse → black text on saturated segment colors.
  // Now the contrast colour is precomputed at build time per segment per mode.
  it("emits --rtk-segment-N-fg with readableTextOn results per mode", () => {
    const css = buildThemeStyleBlock([dualModeTheme]);
    // segment 1: light #4A9E7E and dark #7EC9AA — both saturated mid-tones,
    // both readable as #FFFFFF under the 0.5 luminance cutoff.
    expect(css).toContain("--rtk-segment-1-fg: light-dark(#FFFFFF, #FFFFFF)");
    // segment 4: light #B85B5B and dark #DA8A8A — both readable as #FFFFFF
    expect(css).toContain("--rtk-segment-4-fg: light-dark(#FFFFFF, #FFFFFF)");
  });

  // Regression (Commit G): tag/team/status chip colors moved out of PDS PTag
  // (which has no ::part hooks in v4) into theme.json. The fg is precomputed
  // via readableTextOn at build time per mode, identical to segment fg vars.
  it("emits --rtk-chip-{kind}-{bg,fg} light-dark vars per theme", () => {
    const css = buildThemeStyleBlock([dualModeTheme]);

    expect(css).toContain("--rtk-chip-status-bg: light-dark(#6B6D70, #88898C)");
    expect(css).toContain("--rtk-chip-tag-bg: light-dark(#2762EC, #178BFF)");
    expect(css).toContain("--rtk-chip-team-bg: light-dark(#C45A00, #FF8A3C)");
    expect(css).toContain(
      "--rtk-chip-team-added-bg: light-dark(#1B7C3D, #22A04E)",
    );
    expect(css).toContain(
      "--rtk-chip-team-removed-bg: light-dark(#B8302A, #D14037)",
    );

    expect(css).toMatch(
      /--rtk-chip-status-fg: light-dark\(#[0-9A-F]{6}, #[0-9A-F]{6}\)/,
    );
    expect(css).toMatch(
      /--rtk-chip-tag-fg: light-dark\(#[0-9A-F]{6}, #[0-9A-F]{6}\)/,
    );
    expect(css).toMatch(
      /--rtk-chip-team-fg: light-dark\(#[0-9A-F]{6}, #[0-9A-F]{6}\)/,
    );
    expect(css).toMatch(
      /--rtk-chip-team-added-fg: light-dark\(#[0-9A-F]{6}, #[0-9A-F]{6}\)/,
    );
    expect(css).toMatch(
      /--rtk-chip-team-removed-fg: light-dark\(#[0-9A-F]{6}, #[0-9A-F]{6}\)/,
    );
  });
});

describe("getDefaultMode + getSchemeClassForMode (regression: manifest.default ignored)", () => {
  const singleModeDark: ThemeManifest = {
    ...dualModeTheme,
    id: "acme",
    supports: ["dark"],
    default: "dark",
  };

  it("returns the manifest default for a dual-mode theme when no mode is pinned", () => {
    expect(getDefaultMode(dualModeTheme, "porsche")).toBe("dark");
    expect(
      getSchemeClassForMode(getDefaultMode(dualModeTheme, "porsche")),
    ).toBe("scheme-dark");
  });

  it("opts in to system mode when ':system' is pinned on a dual-mode theme", () => {
    expect(getDefaultMode(dualModeTheme, "porsche:system")).toBe("system");
    expect(
      getSchemeClassForMode(getDefaultMode(dualModeTheme, "porsche:system")),
    ).toBe("scheme-light-dark");
  });

  it("respects an explicit ':light' or ':dark' pin", () => {
    expect(getDefaultMode(dualModeTheme, "porsche:light")).toBe("light");
    expect(getDefaultMode(dualModeTheme, "porsche:dark")).toBe("dark");
  });

  it("falls back to manifest.default if pinned mode is unsupported", () => {
    expect(getDefaultMode(singleModeDark, "acme:light")).toBe("dark");
  });

  it("collapses ':system' on single-mode themes to the only supported mode", () => {
    expect(getDefaultMode(singleModeDark, "acme:system")).toBe("dark");
  });
});

describe("favicon override (ADR-grade ordering invariant)", () => {
  const documentSource = readFileSync(
    join(process.cwd(), "src/pages/_document.tsx"),
    "utf8",
  );

  it('declares rel="icon" overrides AFTER getMetaTagsAndIconLinks', () => {
    const partialIdx = documentSource.indexOf("getMetaTagsAndIconLinks(");
    const svgIconIdx = documentSource.indexOf(
      'href={assetUrl("/favicon.svg")}',
    );
    const icoIconIdx = documentSource.indexOf(
      'href={assetUrl("/favicon.ico")}',
    );

    expect(partialIdx).toBeGreaterThan(-1);
    expect(svgIconIdx).toBeGreaterThan(partialIdx);
    expect(icoIconIdx).toBeGreaterThan(partialIdx);
  });

  it("ships both SVG (modern) and ICO (legacy) favicon overrides", () => {
    expect(documentSource).toMatch(
      /rel="icon"[\s\S]*?type="image\/svg\+xml"[\s\S]*?href=\{assetUrl\("\/favicon\.svg"\)\}/,
    );
    expect(documentSource).toMatch(
      /rel="icon"[\s\S]*?sizes="any"[\s\S]*?href=\{assetUrl\("\/favicon\.ico"\)\}/,
    );
  });
});
