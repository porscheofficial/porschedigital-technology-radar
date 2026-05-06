/**
 * v1 → v2 theme extraction (Layer 3 of the migration plan).
 *
 * Lifts the v1 inline theming keys out of `config.json` into a fresh
 * `themes/<id>/manifest.jsonc` and stamps `defaultTheme: "<id>"` into
 * the now-stripped config. Keys handled:
 *   - root `colors.{foreground,background,highlight,content,text,link,border,tag}`
 *     → `cssVariables.<key>`
 *   - root `backgroundImage` → `background.image` (asset is copied into the
 *     theme folder when present on disk)
 *   - root `backgroundOpacity` → `background.opacity`
 *   - `segments[].color` → `radar.segments[]`
 *   - `rings[].color`    → `radar.rings[]`
 *
 * Keys the v2 schema requires that v1 never had (`surface`, `footer`,
 * `shading`, `frosted`, plus the optional `chips` block) get sensible
 * defaults derived from background/foreground or omitted; the user can
 * tune them later.
 *
 * MUST NOT import `src/lib/config.ts` or `scripts/theme/scanner.ts` for the
 * same reason as the sibling migrate modules: both throw on legacy keys.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import type { ApplyError, ChangeRecord } from "./migrateApply";

export type ThemeMode = "light" | "dark";

export interface ThemeExtractInput {
  cwd: string;
  /** URL-safe slug, becomes the theme directory name and `defaultTheme` value. */
  themeId: string;
  /** Human-readable name shown in the in-app theme switcher. */
  label: string;
  /** Modes the theme provides values for; 1–2 entries. */
  supports: ThemeMode[];
  /** The mode picked when no user preference exists; MUST be in `supports`. */
  defaultMode: ThemeMode;
  /** When false, plan only — no backup, no writes. Default true. */
  write?: boolean;
}

export interface ThemeExtractResult {
  changes: ChangeRecord[];
  /** Backup directory relative to cwd, or null if nothing was written. */
  backupDir: string | null;
  errors: ApplyError[];
  /** Path to the generated manifest, relative to cwd, or null if no extraction happened. */
  manifestPath: string | null;
  /** v1 `colors` keys we did not map (they have no v2 cssVariables equivalent). */
  unmappedColors: string[];
}

const BACKUP_ROOT = ".techradar-migrate-backup";

const V1_COLOR_KEYS_TO_CSS_VAR = [
  "foreground",
  "background",
  "highlight",
  "content",
  "text",
  "link",
  "border",
  "tag",
] as const;

/**
 * Per-mode defaults for every v2 cssVariable. Used to fill any key the
 * v1 config did not provide (so a starter manifest is always usable as-is).
 * Values are sourced from `data/themes/.example/manifest.jsonc`.
 */
const CSS_VAR_DEFAULTS = {
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
  shading: { light: "rgba(20, 20, 20, 0.2)", dark: "rgba(20, 20, 20, 0.67)" },
  frosted: {
    light: "rgba(255, 255, 255, 0.5)",
    dark: "rgba(40, 40, 40, 0.35)",
  },
} as const;

// =============================================================================
// JSON helpers
// =============================================================================

function readConfig(
  cwd: string,
): { ok: true; raw: Record<string, unknown> } | { ok: false; error: string } {
  const path = join(cwd, "config.json");
  if (!existsSync(path)) {
    return { ok: false, error: "config.json not found" };
  }
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    return {
      ok: false,
      error: `config.json read failed: ${(e as Error).message}`,
    };
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { ok: false, error: "config.json is not a JSON object" };
    }
    return { ok: true, raw: parsed as Record<string, unknown> };
  } catch (e) {
    return {
      ok: false,
      error: `config.json is not valid JSON: ${(e as Error).message}`,
    };
  }
}

function asObject(v: unknown): Record<string, unknown> | null {
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function asArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

// =============================================================================
// Manifest builder
// =============================================================================

/**
 * Wrap a single color value as a per-mode object when the theme supports
 * both modes; pass through as a plain string for single-mode themes.
 * v1 only had one palette, so we duplicate into both modes — the user is
 * told to tune the dark mode separately afterwards.
 */
function asModeValue(value: unknown, supports: ThemeMode[]): unknown {
  if (typeof value !== "string") return value;
  if (supports.length === 1) return value;
  const obj: Partial<Record<ThemeMode, string>> = {};
  for (const mode of supports) obj[mode] = value;
  return obj;
}

function buildCssVariables(
  v1Colors: Record<string, unknown>,
  supports: ThemeMode[],
): { cssVariables: Record<string, unknown>; unmapped: string[] } {
  const cssVariables: Record<string, unknown> = {};
  const unmapped: string[] = [];
  for (const key of V1_COLOR_KEYS_TO_CSS_VAR) {
    if (key in v1Colors) {
      cssVariables[key] = asModeValue(v1Colors[key], supports);
    }
  }
  for (const presentKey of Object.keys(v1Colors)) {
    if (!(V1_COLOR_KEYS_TO_CSS_VAR as readonly string[]).includes(presentKey)) {
      unmapped.push(presentKey);
    }
  }
  for (const [key, defaults] of Object.entries(CSS_VAR_DEFAULTS)) {
    if (cssVariables[key] !== undefined) continue;
    if (supports.length === 1) {
      cssVariables[key] = defaults[supports[0]];
    } else {
      const obj: Partial<Record<ThemeMode, string>> = {};
      for (const mode of supports) obj[mode] = defaults[mode];
      cssVariables[key] = obj;
    }
  }
  return { cssVariables, unmapped };
}

function buildBackground(
  raw: Record<string, unknown>,
  supports: ThemeMode[],
): Record<string, unknown> | null {
  const image = raw.backgroundImage;
  const opacity = raw.backgroundOpacity;
  if (image === undefined && opacity === undefined) return null;
  const block: Record<string, unknown> = {};
  if (typeof image === "string") {
    block.image = asModeValue(basename(image), supports);
  }
  if (typeof opacity === "number") {
    block.opacity = asModeValue(opacity, supports);
  }
  return Object.keys(block).length > 0 ? block : null;
}

function buildRadarPalette(
  arr: unknown[] | null,
  supports: ThemeMode[],
): unknown[] {
  if (!arr) return [];
  return arr
    .map((entry) => {
      const obj = asObject(entry);
      if (!obj || typeof obj.color !== "string") return null;
      return asModeValue(obj.color, supports);
    })
    .filter((v) => v !== null);
}

function buildManifest(
  raw: Record<string, unknown>,
  input: ThemeExtractInput,
): { manifest: Record<string, unknown>; unmappedColors: string[] } {
  const v1Colors = asObject(raw.colors) ?? {};
  const { cssVariables, unmapped } = buildCssVariables(
    v1Colors,
    input.supports,
  );
  const background = buildBackground(raw, input.supports);
  // Resolve segments via v2 key first, then v1 alias, matching detector logic.
  const segments = asArray(raw.segments) ?? asArray(raw.quadrants);
  const rings = asArray(raw.rings);
  const radarSegments = buildRadarPalette(segments, input.supports);
  const radarRings = buildRadarPalette(rings, input.supports);
  const manifest: Record<string, unknown> = {
    label: input.label,
    supports: input.supports,
    default: input.defaultMode,
    cssVariables,
  };
  if (background) manifest.background = background;
  manifest.radar = { segments: radarSegments, rings: radarRings };
  return { manifest, unmappedColors: unmapped };
}

// =============================================================================
// Config strip
// =============================================================================

const CONFIG_STRIP_KEYS = [
  "colors",
  "backgroundImage",
  "backgroundOpacity",
] as const;

function stripConfigForV2(
  raw: Record<string, unknown>,
  themeId: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // Insert defaultTheme near the top: after $schema (if any), else first.
  if (raw.$schema !== undefined) out.$schema = raw.$schema;
  out.defaultTheme = themeId;
  for (const [key, value] of Object.entries(raw)) {
    if (key === "$schema" || key === "defaultTheme") continue;
    if ((CONFIG_STRIP_KEYS as readonly string[]).includes(key)) continue;
    if (key === "segments" || key === "quadrants") {
      out[key] = stripPerItemColor(value);
    } else if (key === "rings") {
      out[key] = stripPerItemColor(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function stripPerItemColor(value: unknown): unknown {
  const arr = asArray(value);
  if (!arr) return value;
  return arr.map((entry) => {
    const obj = asObject(entry);
    if (!obj || !("color" in obj)) return entry;
    const rest: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key !== "color") rest[key] = val;
    }
    return rest;
  });
}

// =============================================================================
// Backup & write
// =============================================================================

function backupTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function snapshotFile(cwd: string, backupDir: string, relPath: string): void {
  const src = join(cwd, relPath);
  if (!existsSync(src)) return;
  const dest = join(cwd, backupDir, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

// =============================================================================
// Public API
// =============================================================================

const EMPTY_RESULT: ThemeExtractResult = {
  changes: [],
  backupDir: null,
  errors: [],
  manifestPath: null,
  unmappedColors: [],
};

/**
 * Pure orchestrator. Reads config.json, builds manifest + stripped config,
 * optionally backs up & writes to disk. Returns a structured result for
 * the CLI to render (and for tests to assert on).
 */
export function extractThemeFromConfig(
  input: ThemeExtractInput,
): ThemeExtractResult {
  const { cwd, themeId, write = true } = input;
  if (!input.supports.includes(input.defaultMode)) {
    return {
      ...EMPTY_RESULT,
      errors: [
        {
          file: "(input)",
          message: `defaultMode '${input.defaultMode}' is not in supports [${input.supports.join(", ")}].`,
        },
      ],
    };
  }

  const read = readConfig(cwd);
  if (!read.ok) {
    return {
      ...EMPTY_RESULT,
      errors: [{ file: "config.json", message: read.error }],
    };
  }
  const raw = read.raw;
  const hasV1Theming =
    raw.colors !== undefined ||
    raw.backgroundImage !== undefined ||
    raw.backgroundOpacity !== undefined ||
    hasPerItemColor(raw.segments) ||
    hasPerItemColor(raw.quadrants) ||
    hasPerItemColor(raw.rings);

  const { manifest, unmappedColors } = buildManifest(raw, input);
  const strippedConfig = stripConfigForV2(raw, themeId);

  const changes: ChangeRecord[] = [];
  const themeRel = join("themes", themeId);
  const manifestRel = join(themeRel, "manifest.jsonc");
  changes.push({
    file: manifestRel,
    description: hasV1Theming
      ? `Created v2 theme manifest from v1 config keys`
      : `Created starter v2 theme manifest`,
  });
  changes.push({
    file: "config.json",
    description: `Added defaultTheme: "${themeId}" and stripped v1 theming keys`,
  });
  const assetCopies = planAssetCopies(cwd, raw, themeRel);
  for (const copy of assetCopies) {
    changes.push({
      file: copy.dest,
      description: `Copied background asset from ${copy.src}`,
    });
  }

  if (!write) {
    return {
      changes,
      backupDir: null,
      errors: [],
      manifestPath: manifestRel,
      unmappedColors,
    };
  }

  const errors: ApplyError[] = [];
  const backupDir = join(BACKUP_ROOT, backupTimestamp());
  try {
    snapshotFile(cwd, backupDir, "config.json");
  } catch (e) {
    errors.push({
      file: "config.json",
      message: `backup failed: ${(e as Error).message}`,
    });
  }

  try {
    const manifestAbs = join(cwd, manifestRel);
    mkdirSync(dirname(manifestAbs), { recursive: true });
    writeFileSync(
      manifestAbs,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
  } catch (e) {
    errors.push({ file: manifestRel, message: (e as Error).message });
  }

  try {
    writeFileSync(
      join(cwd, "config.json"),
      `${JSON.stringify(strippedConfig, null, 2)}\n`,
      "utf8",
    );
  } catch (e) {
    errors.push({ file: "config.json", message: (e as Error).message });
  }

  for (const copy of assetCopies) {
    try {
      const destAbs = join(cwd, copy.dest);
      mkdirSync(dirname(destAbs), { recursive: true });
      copyFileSync(join(cwd, copy.src), destAbs);
    } catch (e) {
      errors.push({ file: copy.dest, message: (e as Error).message });
    }
  }

  return {
    changes,
    backupDir,
    errors,
    manifestPath: manifestRel,
    unmappedColors,
  };
}

interface AssetCopy {
  src: string;
  dest: string;
}

function planAssetCopies(
  cwd: string,
  raw: Record<string, unknown>,
  themeRel: string,
): AssetCopy[] {
  const image = raw.backgroundImage;
  if (typeof image !== "string") return [];
  // v1 backgroundImage paths are typically absolute-ish (e.g. /background.jpg)
  // resolved against /public. Accept both leading-slash and bare filenames.
  const stripped = image.replace(/^\/+/, "");
  const candidates = [join("public", stripped), stripped];
  for (const candidate of candidates) {
    if (existsSync(join(cwd, candidate))) {
      return [{ src: candidate, dest: join(themeRel, basename(stripped)) }];
    }
  }
  return [];
}

function hasPerItemColor(value: unknown): boolean {
  const arr = asArray(value);
  if (!arr) return false;
  return arr.some((entry) => {
    const obj = asObject(entry);
    return obj !== null && "color" in obj;
  });
}
