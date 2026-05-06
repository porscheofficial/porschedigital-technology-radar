import fs from "node:fs";
import path from "node:path";
import { type ParseError, parse as parseJsonc } from "jsonc-parser";
import type { ThemeJson, ThemeManifest } from "@/lib/theme/schema";
import { ThemeJsonSchema } from "@/lib/theme/schema";

export interface ScannerOptions {
  builtinDir: string;
  consumerDir?: string;
  segmentsCount: number;
  ringsCount: number;
  defaultTheme: string;
  enabledThemes?: string[];
}

const LEGACY_SCHEMA_ERROR = (id: string) =>
  `Theme '${id}' uses the legacy v1 schema (colorScheme field). ` +
  "PDS v4 + theme×mode requires the new shape — see " +
  "data/themes/.example/manifest.jsonc for an annotated reference and " +
  "MIGRATION.md (Section 'v1 → v2', step 3) for the field-by-field mapping. " +
  "No automated migration is provided; rewrite manifest.jsonc by hand.";

function parseThemeFile(themePath: string, id: string): unknown {
  const raw = fs.readFileSync(themePath, "utf8");
  const errors: ParseError[] = [];
  const parsed: unknown = parseJsonc(raw, errors, {
    allowTrailingComma: true,
  });

  if (errors.length > 0) {
    const detail = errors
      .map((e) => `offset ${e.offset}: error code ${e.error}`)
      .join("; ");
    throw new Error(
      `theme '${id}' (${themePath}): JSONC parse error — ${detail}`,
    );
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "colorScheme" in parsed
  ) {
    throw new Error(LEGACY_SCHEMA_ERROR(id));
  }

  return parsed;
}

function loadThemeJson(
  entryPath: string,
  id: string,
  segmentsCount: number,
  ringsCount: number,
): ThemeJson {
  const themePath = path.join(entryPath, "manifest.jsonc");
  const parsed = parseThemeFile(themePath, id);
  const parseResult = ThemeJsonSchema.safeParse(parsed);

  if (!parseResult.success) {
    throw new Error(
      `theme '${id}' (${themePath}): ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const themeJson = parseResult.data;

  if (themeJson.radar.segments.length !== segmentsCount) {
    throw new Error(
      `theme '${id}': radar.segments has ${themeJson.radar.segments.length} entries but config.segments has ${segmentsCount}`,
    );
  }

  if (themeJson.radar.rings.length !== ringsCount) {
    throw new Error(
      `theme '${id}': radar.rings has ${themeJson.radar.rings.length} entries but config.rings has ${ringsCount}`,
    );
  }

  return themeJson;
}

function readThemeDir(
  dir: string,
  segmentsCount: number,
  ringsCount: number,
): Map<string, ThemeJson> {
  const result = new Map<string, ThemeJson>();

  if (!fs.existsSync(dir)) {
    return result;
  }

  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;

    const entryPath = path.join(dir, name);
    if (!fs.statSync(entryPath).isDirectory()) continue;

    result.set(name, loadThemeJson(entryPath, name, segmentsCount, ringsCount));
  }

  return result;
}

export function scanThemes(opts: ScannerOptions): ThemeManifest[] {
  const {
    builtinDir,
    consumerDir,
    segmentsCount,
    ringsCount,
    defaultTheme,
    enabledThemes,
  } = opts;

  const builtins = readThemeDir(builtinDir, segmentsCount, ringsCount);
  const merged = new Map<string, ThemeJson>(builtins);

  if (consumerDir !== undefined) {
    const consumers = readThemeDir(consumerDir, segmentsCount, ringsCount);
    for (const [id, themeJson] of consumers) {
      if (builtins.has(id)) {
        console.warn(
          `[theme-scanner] Consumer theme '${id}' overrides builtin`,
        );
      }
      merged.set(id, themeJson);
    }
  }

  let themes: ThemeManifest[] = Array.from(merged.entries()).map(
    ([id, themeJson]) => ({
      ...themeJson,
      id,
      assetsResolved: {},
    }),
  );

  if (enabledThemes !== undefined) {
    themes = themes.filter((t) => enabledThemes.includes(t.id));

    if (!themes.some((t) => t.id === defaultTheme)) {
      throw new Error(
        `defaultTheme '${defaultTheme}' not found in enabled themes [${enabledThemes.join(", ")}]`,
      );
    }
  }

  return themes;
}
