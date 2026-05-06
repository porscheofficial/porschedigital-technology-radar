/**
 * v1 → v2 migration detector.
 *
 * Read-only scan of a consumer project's CWD that classifies legacy
 * configuration shapes into actionable findings. Used by:
 *   - `npx techradar migrate` (this is the whole subcommand)
 *   - `setup()` in bin/techradar.ts (one-line nudge before hard throws fire)
 *
 * MUST NOT import `src/lib/config.ts` or `scripts/theme/scanner.ts` —
 * both throw on legacy keys, defeating the diagnostic purpose. We do raw
 * parsing here and never throw; every problem becomes a Finding.
 *
 * See MIGRATION.md (Section "v1 → v2") for the user-facing recipe each
 * finding's `fix` field references.
 */

import { type Dirent, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "@11ty/gray-matter";
import { type ParseError, parse as parseJsonc } from "jsonc-parser";

export type Severity = "error" | "warn";

export interface Finding {
  /** `error` = v2 hard-throws on this; `warn` = v2 soft-shims with a deprecation warning. */
  severity: Severity;
  /** Path relative to scanned cwd. */
  file: string;
  /** Stable identifier of the offending key (e.g. `config.json:colors`). */
  key: string;
  /** Human-readable description of what's wrong. */
  message: string;
  /** Pointer to the MIGRATION.md section that explains the fix. */
  fix: string;
}

export interface MigrationReport {
  findings: Finding[];
  /** True if any error or warn was found. */
  hasV1Markers: boolean;
  /** True if any error (hard-throw) was found. Use for setup() nudge gating. */
  hasErrors: boolean;
}

const MIGRATION_DOC = "MIGRATION.md";
const LEGACY_ROOT_KEYS = [
  "colors",
  "backgroundImage",
  "backgroundOpacity",
] as const;

// ---------------------------------------------------------------------------
// config.json
// ---------------------------------------------------------------------------

function checkLegacyRootKeys(parsed: Record<string, unknown>): Finding[] {
  const findings: Finding[] = [];
  for (const key of LEGACY_ROOT_KEYS) {
    if (key in parsed) {
      findings.push({
        severity: "error",
        file: "config.json",
        key: `config.json:${key}`,
        message: `Legacy v1 key '${key}' is no longer supported.`,
        fix: `Move '${key}' into themes/<id>/manifest.jsonc. See ${MIGRATION_DOC} (Section "v1 → v2", step 3).`,
      });
    }
  }
  return findings;
}

function checkPerItemColor(
  parsed: Record<string, unknown>,
  arrayKey: "segments" | "rings",
  manifestPath: string,
): Finding[] {
  const findings: Finding[] = [];
  const items =
    arrayKey === "segments"
      ? ((parsed.segments ?? parsed.quadrants) as
          | Array<Record<string, unknown>>
          | undefined)
      : (parsed.rings as Array<Record<string, unknown>> | undefined);
  if (!Array.isArray(items)) return findings;

  const singular = arrayKey === "segments" ? "segment" : "ring";
  for (const [i, item] of items.entries()) {
    if (!item || typeof item !== "object" || !("color" in item)) continue;
    findings.push({
      severity: "error",
      file: "config.json",
      key: `config.json:${arrayKey}[${i}].color`,
      message: `Per-${singular} 'color' is no longer supported (${arrayKey}[${i}]: ${String(item.id ?? i)}).`,
      fix: `Move ${singular} colors into manifest.jsonc → ${manifestPath}. See ${MIGRATION_DOC} (Section "v1 → v2", step 3).`,
    });
  }
  return findings;
}

function readConfigJson(
  filePath: string,
): { parsed: Record<string, unknown> } | { parseError: Finding } | null {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    // Not initialized — not a v1 problem, just nothing to detect.
    return null;
  }
  try {
    return { parsed: JSON.parse(raw) as Record<string, unknown> };
  } catch (err) {
    return {
      parseError: {
        severity: "error",
        file: "config.json",
        key: "config.json:parse",
        message: `config.json is not valid JSON: ${(err as Error).message}`,
        fix: `Fix the JSON syntax error before running migrate again. See ${MIGRATION_DOC}.`,
      },
    };
  }
}

export function detectConfigJson(cwd: string): Finding[] {
  const result = readConfigJson(join(cwd, "config.json"));
  if (result === null) return [];
  if ("parseError" in result) return [result.parseError];

  const { parsed } = result;
  const findings: Finding[] = [];
  findings.push(...checkLegacyRootKeys(parsed));

  if ("quadrants" in parsed && !("segments" in parsed)) {
    findings.push({
      severity: "warn",
      file: "config.json",
      key: "config.json:quadrants",
      message: `Legacy key 'quadrants' is deprecated; use 'segments' instead.`,
      fix: `Rename 'quadrants' → 'segments' in config.json. See ${MIGRATION_DOC} (Section "v1 → v2", step 2).`,
    });
  }

  findings.push(...checkPerItemColor(parsed, "segments", "radar.segments"));
  findings.push(...checkPerItemColor(parsed, "rings", "radar.rings"));

  const defaultTheme = parsed.defaultTheme;
  if (typeof defaultTheme !== "string" || defaultTheme.trim().length === 0) {
    findings.push({
      severity: "error",
      file: "config.json",
      key: "config.json:defaultTheme",
      message: `Required field 'defaultTheme' is missing or empty.`,
      fix: `Add "defaultTheme": "<theme-id>" referencing a theme under themes/<id>/. See ${MIGRATION_DOC} (Section "v1 → v2", step 1).`,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// radar/**/*.md frontmatter
// ---------------------------------------------------------------------------

function collectMarkdownFiles(dirPath: string): string[] {
  const files: string[] = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

export function detectFrontmatter(cwd: string): Finding[] {
  const radarDir = join(cwd, "radar");
  const findings: Finding[] = [];

  // Tolerate missing radar/ — project may use a different layout or be uninitialised.
  try {
    if (!statSync(radarDir).isDirectory()) return findings;
  } catch {
    return findings;
  }

  const files = collectMarkdownFiles(radarDir);
  for (const filePath of files) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    let data: Record<string, unknown>;
    try {
      data = matter(content).data as Record<string, unknown>;
    } catch {
      // Malformed frontmatter — `validate` will report it. Skip silently here.
      continue;
    }

    if (data.quadrant !== undefined && data.segment === undefined) {
      const rel = relative(cwd, filePath);
      findings.push({
        severity: "warn",
        file: rel,
        key: `${rel}:quadrant`,
        message: `Frontmatter uses legacy 'quadrant:' key.`,
        fix: `Rename 'quadrant:' → 'segment:' in this file. See ${MIGRATION_DOC} (Section "v1 → v2", step 2).`,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// themes/*/manifest.jsonc
// ---------------------------------------------------------------------------

export function detectThemes(cwd: string): Finding[] {
  const themesDir = join(cwd, "themes");
  const findings: Finding[] = [];

  let entries: Dirent[];
  try {
    entries = readdirSync(themesDir, { withFileTypes: true });
  } catch {
    // No themes/ — typical for v1 projects. The config-level errors
    // above already nudge the user toward creating one.
    return findings;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue; // skip .example etc.

    const manifestPath = join(themesDir, entry.name, "manifest.jsonc");
    let raw: string;
    try {
      raw = readFileSync(manifestPath, "utf-8");
    } catch {
      continue;
    }

    const parseErrors: ParseError[] = [];
    const parsed = parseJsonc(raw, parseErrors, {
      allowTrailingComma: true,
    }) as Record<string, unknown> | undefined;

    const rel = relative(cwd, manifestPath);

    if (parseErrors.length > 0 || !parsed || typeof parsed !== "object") {
      findings.push({
        severity: "error",
        file: rel,
        key: `${rel}:parse`,
        message: `manifest.jsonc could not be parsed.`,
        fix: `Fix JSONC syntax errors. See data/themes/.example/manifest.jsonc for a reference.`,
      });
      continue;
    }

    if ("colorScheme" in parsed) {
      findings.push({
        severity: "error",
        file: rel,
        key: `${rel}:colorScheme`,
        message: `Theme '${entry.name}' uses the legacy v1 'colorScheme' shape.`,
        fix: `Rewrite this manifest using data/themes/.example/manifest.jsonc as a template. See ${MIGRATION_DOC} (Section "v1 → v2", step 3).`,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export function detectAll(cwd: string): MigrationReport {
  const findings = [
    ...detectConfigJson(cwd),
    ...detectFrontmatter(cwd),
    ...detectThemes(cwd),
  ];
  const hasErrors = findings.some((f) => f.severity === "error");
  return {
    findings,
    hasV1Markers: findings.length > 0,
    hasErrors,
  };
}
