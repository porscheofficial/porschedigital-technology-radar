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
  resolveModeValue,
  type ThemeManifest,
  type ThemeModeValue,
} from "@/lib/theme/schema";
import { assetUrl, readableTextOn } from "@/lib/utils";
import rawThemes from "../../data/themes.generated.json";

const themes = rawThemes as unknown as ThemeManifest[];
const defaultTheme = getDefaultTheme(themes, config.defaultTheme);
const defaultThemeId = defaultTheme.id;
const defaultSchemeClass = getDefaultSchemeClass(defaultTheme);
const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var b=localStorage.getItem('techradar-theme')||'${defaultThemeId}';var m=localStorage.getItem('techradar-mode')||'system';d.setAttribute('data-theme',b);d.classList.remove('scheme-light','scheme-dark','scheme-light-dark');if(m==='light'){d.classList.add('scheme-light');}else if(m==='dark'){d.classList.add('scheme-dark');}else{d.classList.add('scheme-light-dark');}}catch(e){}})();`;

export function buildThemeStyleBlock(allThemes: ThemeManifest[]): string {
  return allThemes.map((theme) => buildThemeBlock(theme)).join("\n");
}

function buildThemeBlock(theme: ThemeManifest): string {
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

  theme.radar.segments.forEach((value, index) => {
    baseVars.push(`--rtk-segment-${index + 1}: ${toCssValue(value)}`);
    baseVars.push(
      `--rtk-segment-${index + 1}-fg: ${toReadableForegroundCssValue(value)}`,
    );
  });
  theme.radar.rings.forEach((value, index) => {
    baseVars.push(`--rtk-ring-${index + 1}: ${toCssValue(value)}`);
  });

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

const themeStyleBlock = buildThemeStyleBlock(themes);

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
        <style id="theme-vars">{themeStyleBlock}</style>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional blocking theme-init script — string literal, no user data */}
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

function getDefaultSchemeClass(
  theme: ThemeManifest,
): "scheme-light" | "scheme-dark" | "scheme-light-dark" {
  if (theme.supports.length === 2) {
    return "scheme-light-dark";
  }

  return theme.default === "light" ? "scheme-light" : "scheme-dark";
}
