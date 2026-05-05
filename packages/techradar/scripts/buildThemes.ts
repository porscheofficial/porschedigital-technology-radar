// packages/techradar/scripts/buildThemes.ts
// Produces: data/themes.generated.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "@/lib/config";
import {
  normalizeThemePreferenceMode,
  THEME_PREFERENCE_MODES,
  type ThemeManifest,
} from "@/lib/theme/schema";
import { materializeThemeAssets } from "./theme/assets";
import { scanThemes } from "./theme/scanner";

const PACKAGE_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const BUILTIN_THEMES_DIR = path.join(PACKAGE_ROOT, "data", "themes");
const PUBLIC_DIR = path.join(PACKAGE_ROOT, "public");
const OUTPUT_PATH = path.join(PACKAGE_ROOT, "data", "themes.generated.json");

export const THEMES_SOURCE_DIR = BUILTIN_THEMES_DIR;

export async function buildThemes(): Promise<void> {
  if (
    typeof config.defaultTheme !== "string" ||
    config.defaultTheme.length === 0
  ) {
    throw new Error(
      "config.defaultTheme must be a non-empty string identifying a theme under data/themes/.",
    );
  }

  const consumerThemesDir =
    process.cwd() !== PACKAGE_ROOT
      ? path.join(process.cwd(), "data", "themes")
      : undefined;

  const rawThemes = scanThemes({
    builtinDir: BUILTIN_THEMES_DIR,
    consumerDir: consumerThemesDir,
    segmentsCount: config.segments.length,
    ringsCount: config.rings.length,
    defaultTheme: config.defaultTheme,
  });

  const sourceRootByThemeId: Record<string, string> = {};
  for (const t of rawThemes) {
    const builtinPath = path.join(BUILTIN_THEMES_DIR, t.id);
    const consumerPath = consumerThemesDir
      ? path.join(consumerThemesDir, t.id)
      : undefined;
    sourceRootByThemeId[t.id] =
      consumerPath && fs.existsSync(consumerPath) ? consumerPath : builtinPath;
  }

  const themes = materializeThemeAssets({
    themes: rawThemes,
    publicDir: PUBLIC_DIR,
    sourceRootByThemeId,
  }).sort((left, right) => left.id.localeCompare(right.id));

  validateDefaultTheme(config.defaultTheme, themes);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(themes, null, 2), "utf-8");
  console.log(
    `[build:themes] Written ${themes.length} theme(s) to data/themes.generated.json`,
  );
}

function validateDefaultTheme(
  defaultTheme: string,
  themes: ThemeManifest[],
): void {
  const [themeId, rawMode] = defaultTheme.split(":");
  const theme = themes.find((entry) => entry.id === themeId);

  if (!theme) {
    throw new Error(
      `config.defaultTheme must reference a known theme. '${defaultTheme}' was not found under data/themes/.`,
    );
  }

  if (!rawMode) {
    return;
  }

  if (
    !THEME_PREFERENCE_MODES.includes(
      rawMode as (typeof THEME_PREFERENCE_MODES)[number],
    ) ||
    rawMode !==
      normalizeThemePreferenceMode(
        rawMode as (typeof THEME_PREFERENCE_MODES)[number],
        theme,
      )
  ) {
    throw new Error(
      `config.defaultTheme '${defaultTheme}' uses an unsupported mode for theme '${theme.id}'.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  if (process.argv[1] !== fileURLToPath(import.meta.url)) {
    return;
  }
  await buildThemes();
}
