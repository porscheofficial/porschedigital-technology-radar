import {
  getComponentChunkLinks,
  getFontLinks,
  getIconLinks,
  getMetaTagsAndIconLinks,
} from "@porsche-design-system/components-react/partials";
import { Head, Html, Main, NextScript } from "next/document";
import config from "@/lib/config";
import { getLabel } from "@/lib/data";
import {
  CHIP_KINDS,
  CHROME_CSS_VARIABLE_KEYS,
  isModeValueObject,
  type PaletteCounts,
  paletteAt,
  resolveModeValue,
  type ThemeManifest,
  type ThemeModeValue,
} from "@/lib/theme/schema";
import { getThemes } from "@/lib/themeManifest";
import { assetUrl, readableTextOn } from "@/lib/utils";

const themes = getThemes();
const defaultTheme = getDefaultTheme(themes, config.defaultTheme);
const defaultThemeId = defaultTheme.id;
const defaultMode = getDefaultMode(defaultTheme, config.defaultTheme);
const defaultSchemeClass = getSchemeClassForMode(defaultMode);
const paletteCounts: PaletteCounts = {
  segments: config.segments.length,
  rings: config.rings.length,
};
const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var b=localStorage.getItem('techradar-theme')||'${defaultThemeId}';var m=localStorage.getItem('techradar-mode')||'${defaultMode}';d.setAttribute('data-theme',b);d.classList.remove('scheme-light','scheme-dark','scheme-light-dark');if(m==='light'){d.classList.add('scheme-light');}else if(m==='dark'){d.classList.add('scheme-dark');}else{d.classList.add('scheme-light-dark');}}catch(e){}})();`;

export function buildThemeStyleBlock(
  allThemes: ThemeManifest[],
  counts: PaletteCounts,
): string {
  return allThemes.map((theme) => buildThemeBlock(theme, counts)).join("\n");
}

function buildThemeBlock(theme: ThemeManifest, counts: PaletteCounts): string {
  // Color vars use `light-dark()` because the CSS function only accepts <color>
  // arguments. Image (url/none) and opacity (number) are NOT colors, so they
  // are emitted via per-scheme-class selectors below — wrapping them in
  // `light-dark()` makes the property invalid and Chromium drops the whole
  // shorthand (background image disappears, opacity falls back to 1).
  const baseVars: string[] = [];

  for (const key of CHROME_CSS_VARIABLE_KEYS) {
    const cssKey = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    baseVars.push(`${cssKey}: ${toCssValue(theme.cssVariables[key])}`);
  }

  // Palette cycling contract: when the consumer's config.json declares more
  // segments/rings than this theme's manifest defines colors for, we cycle
  // through the manifest palette via paletteAt(). Theme authors only need to
  // ship a representative palette (4 entries is typical) — the framework
  // handles arbitrary taxonomy sizes. See data/themes/.example/manifest.jsonc.
  const segmentCount = Math.max(theme.radar.segments.length, counts.segments);
  const ringCount = Math.max(theme.radar.rings.length, counts.rings);

  for (let index = 0; index < segmentCount; index += 1) {
    const value = paletteAt(theme.radar.segments, index);
    baseVars.push(`--rtk-segment-${index + 1}: ${toCssValue(value)}`);
    baseVars.push(
      `--rtk-segment-${index + 1}-fg: ${toReadableForegroundCssValue(value)}`,
    );
  }
  for (let index = 0; index < ringCount; index += 1) {
    const value = paletteAt(theme.radar.rings, index);
    baseVars.push(`--rtk-ring-${index + 1}: ${toCssValue(value)}`);
  }

  if (theme.chips) {
    for (const kind of CHIP_KINDS) {
      const chipValue = theme.chips[kind];
      baseVars.push(`--rtk-chip-${kind}-bg: ${toCssValue(chipValue)}`);
      baseVars.push(
        `--rtk-chip-${kind}-fg: ${toReadableForegroundCssValue(chipValue)}`,
      );
    }
  }

  const blocks: string[] = [
    `:root[data-theme="${theme.id}"] { ${baseVars.join("; ")} }`,
  ];

  const lightVars = backgroundVarsForMode(theme, "light");
  const darkVars = backgroundVarsForMode(theme, "dark");
  const supportsLight = theme.supports.includes("light");
  const supportsDark = theme.supports.includes("dark");

  if (supportsLight) {
    blocks.push(
      `:root.scheme-light[data-theme="${theme.id}"] { ${lightVars} }`,
    );
  }
  if (supportsDark) {
    blocks.push(`:root.scheme-dark[data-theme="${theme.id}"] { ${darkVars} }`);
  }
  if (supportsLight && supportsDark) {
    blocks.push(
      `:root.scheme-light-dark[data-theme="${theme.id}"] { ${lightVars} }`,
    );
    blocks.push(
      `@media (prefers-color-scheme: dark) { :root.scheme-light-dark[data-theme="${theme.id}"] { ${darkVars} } }`,
    );
  }

  return blocks.join("\n");
}

function backgroundVarsForMode(
  theme: ThemeManifest,
  mode: "light" | "dark",
): string {
  if (!theme.background) {
    return "--background-image: none; --background-opacity: 0";
  }

  const image = theme.assetsResolved.image;
  let imageValue = "none";
  if (typeof image === "string") {
    imageValue = `url("${assetUrl(image)}")`;
  } else {
    const modeImage = resolveModeValue(image, mode);
    if (modeImage) {
      imageValue = `url("${assetUrl(modeImage)}")`;
    }
  }

  const opacityRaw = resolveModeValue(theme.background.opacity, mode);
  const opacityValue = opacityRaw === undefined ? "0" : String(opacityRaw);

  return `--background-image: ${imageValue}; --background-opacity: ${opacityValue}`;
}

const themeStyleBlock = buildThemeStyleBlock(themes, paletteCounts);

export default function Document() {
  return (
    <Html
      lang="en"
      className={defaultSchemeClass}
      data-theme={defaultThemeId}
      data-scroll-behavior="smooth"
    >
      <Head>
        {getFontLinks({ format: "jsx", weights: ["regular", "semi-bold"] })}
        {getComponentChunkLinks({ format: "jsx" })}
        {getIconLinks({ format: "jsx" })}
        {getMetaTagsAndIconLinks({
          appTitle: getLabel("title"),
          format: "jsx",
        })}
        {/*
          PDS' getMetaTagsAndIconLinks above injects <link rel="icon"> pointing
          at Porsche assets, which suppresses the browser's /favicon.ico
          fallback. Re-declaring rel="icon" AFTER the partial wins the icon
          pick (last-declared wins), so consumer public/favicon.{svg,ico}
          (overlaid at build time by bin/techradar.ts → syncFilesToBuildDir)
          actually shows up in the tab. Order matters — do not move above PDS.
        */}
        <link rel="icon" type="image/svg+xml" href={assetUrl("/favicon.svg")} />
        <link rel="icon" sizes="any" href={assetUrl("/favicon.ico")} />
        <style id="theme-vars">{themeStyleBlock}</style>
        {/*
          Security exemption: this blocking inline script must run before
          hydration to prevent theme FOUC, its source is the in-file constant
          THEME_INIT_SCRIPT, and it never includes user-controlled input. Keep
          the biome-ignore below with this exemption.
        */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: pre-hydration theme init exemption; THEME_INIT_SCRIPT is an in-file constant with no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

function toCssValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  const light = resolveModeValue(value, "light");
  const dark = resolveModeValue(value, "dark");

  if (light !== undefined && dark !== undefined) {
    return `light-dark(${light}, ${dark})`;
  }

  return String(light ?? dark ?? "");
}

// Tooltip text needs a readable contrast color computed against the segment
// hex. We can't do this in CSS (no luminance function) so the readable color
// is precomputed per mode and exposed as `--rtk-segment-N-fg`. Consumers use
// `var(--rtk-segment-N-fg)` directly — readableTextOn() at runtime would get
// a CSS var ref string, fail to parse, and fall back to dark ink (the bug
// this function exists to prevent).
function toReadableForegroundCssValue(value: ThemeModeValue<string>): string {
  if (!isModeValueObject(value)) {
    return readableTextOn(value);
  }

  const light = value.light;
  const dark = value.dark;

  if (light !== undefined && dark !== undefined) {
    return `light-dark(${readableTextOn(light)}, ${readableTextOn(dark)})`;
  }

  return readableTextOn(light ?? dark ?? "");
}

function getDefaultTheme(
  themes: ThemeManifest[],
  defaultThemeId: string,
): ThemeManifest {
  const [themeId] = defaultThemeId.split(":");
  return themes.find((theme) => theme.id === themeId) ?? themes[0];
}

export function getDefaultMode(
  theme: ThemeManifest,
  defaultThemeId: string,
): "light" | "dark" | "system" {
  const [, rawMode] = defaultThemeId.split(":");
  if (rawMode === "light" || rawMode === "dark" || rawMode === "system") {
    if (rawMode === "system" && theme.supports.length === 1) {
      return theme.supports[0];
    }
    if (
      (rawMode === "light" || rawMode === "dark") &&
      !theme.supports.includes(rawMode)
    ) {
      return theme.default;
    }
    return rawMode;
  }
  return theme.default;
}

export function getSchemeClassForMode(
  mode: "light" | "dark" | "system",
): "scheme-light" | "scheme-dark" | "scheme-light-dark" {
  if (mode === "system") return "scheme-light-dark";
  return mode === "light" ? "scheme-light" : "scheme-dark";
}
