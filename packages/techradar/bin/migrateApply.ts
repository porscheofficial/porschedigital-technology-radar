/**
 * v1 → v2 mechanical rewrites (Layer 2 of the migration plan).
 *
 * Performs only the deterministic renames that need no user input:
 *   - config.json: top-level `quadrants` → `segments`
 *   - radar/(slash)(slash)*.md frontmatter: `quadrant:` → `segment:` (YAML fence only)
 *
 * Hard-throw v1 keys (root colors, per-segment/ring color, missing
 * defaultTheme, legacy theme manifests) are intentionally NOT touched here —
 * those need user choices and are Phase 4 (theme extraction).
 *
 * Every write is preceded by a backup snapshot of the affected file under
 * `.techradar-migrate-backup/<iso-timestamp>/<original-relative-path>`.
 *
 * MUST NOT import `src/lib/config.ts` or `scripts/theme/scanner.ts` for the
 * same reason as migrateDetect.ts: both throw on legacy keys.
 */

import {
  copyFileSync,
  type Dirent,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

export interface ChangeRecord {
  /** Path relative to cwd. */
  file: string;
  /** What was rewritten (one short line, suitable for log output). */
  description: string;
}

export interface ApplyError {
  file: string;
  message: string;
}

export interface ApplyResult {
  changes: ChangeRecord[];
  /** Backup directory (relative to cwd) or null if no changes were written. */
  backupDir: string | null;
  errors: ApplyError[];
}

export interface ApplyOptions {
  cwd: string;
  /**
   * When false, returns the ChangeRecord list without writing anything (and
   * without creating a backup). Useful for dry-run previews. Defaults true.
   */
  write?: boolean;
}

const BACKUP_ROOT = ".techradar-migrate-backup";

// ---------------------------------------------------------------------------
// Backup helper
// ---------------------------------------------------------------------------

function backupTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function snapshotFile(cwd: string, backupDir: string, absPath: string): void {
  const rel = relative(cwd, absPath);
  const dest = join(cwd, backupDir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(absPath, dest);
}

// ---------------------------------------------------------------------------
// config.json rename
// ---------------------------------------------------------------------------

interface ConfigRenamePlan {
  absPath: string;
  rel: string;
  before: string;
  after: string;
}

function planConfigRename(cwd: string): ConfigRenamePlan | null {
  const absPath = join(cwd, "config.json");
  let before: string;
  try {
    before = readFileSync(absPath, "utf-8");
  } catch {
    return null;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(before) as Record<string, unknown>;
  } catch {
    return null; // detector already reports parse errors
  }
  if (!("quadrants" in parsed) || "segments" in parsed) return null;

  // Object.entries preserves insertion order for string keys, so renaming
  // in-place this way keeps the user's original key order intact.
  const renamed = Object.fromEntries(
    Object.entries(parsed).map(([k, v]) =>
      k === "quadrants" ? ["segments", v] : [k, v],
    ),
  );
  const after = `${JSON.stringify(renamed, null, 2)}\n`;
  return { absPath, rel: "config.json", before, after };
}

// ---------------------------------------------------------------------------
// Frontmatter rename
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

/**
 * Locate the leading `---\n…\n---` YAML fence and rewrite occurrences of
 * `^quadrant:` to `segment:` inside it. Returns null when no fence is found,
 * the fence already contains a `segment:` key, or no `quadrant:` key exists.
 *
 * The body of the markdown is untouched — only the fenced YAML region is
 * rewritten. Any leading whitespace before the opening fence is tolerated.
 */
function rewriteFrontmatter(content: string): string | null {
  const fenceMatch = content.match(
    /^(\s*---\r?\n)([\s\S]*?)(\r?\n---\s*\r?\n)/,
  );
  if (!fenceMatch) return null;
  const [whole, open, yaml, close] = fenceMatch;
  if (/^segment\s*:/m.test(yaml)) return null;
  if (!/^quadrant\s*:/m.test(yaml)) return null;
  const rewritten = yaml.replace(/^quadrant(\s*:)/gm, "segment$1");
  return content.replace(whole, `${open}${rewritten}${close}`);
}

interface FrontmatterRenamePlan {
  absPath: string;
  rel: string;
  before: string;
  after: string;
}

function planFrontmatterRenames(cwd: string): FrontmatterRenamePlan[] {
  const radarDir = join(cwd, "radar");
  try {
    if (!statSync(radarDir).isDirectory()) return [];
  } catch {
    return [];
  }
  const plans: FrontmatterRenamePlan[] = [];
  for (const absPath of collectMarkdownFiles(radarDir)) {
    let before: string;
    try {
      before = readFileSync(absPath, "utf-8");
    } catch {
      continue;
    }
    const after = rewriteFrontmatter(before);
    if (after === null || after === before) continue;
    plans.push({ absPath, rel: relative(cwd, absPath), before, after });
  }
  return plans;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export function applyMechanicalRenames(opts: ApplyOptions): ApplyResult {
  const { cwd, write = true } = opts;
  const errors: ApplyError[] = [];
  const changes: ChangeRecord[] = [];

  const configPlan = planConfigRename(cwd);
  const fmPlans = planFrontmatterRenames(cwd);
  const totalPlans = (configPlan ? 1 : 0) + fmPlans.length;

  if (totalPlans === 0) {
    return { changes, backupDir: null, errors };
  }

  if (!write) {
    if (configPlan) {
      changes.push({
        file: configPlan.rel,
        description: "Rename top-level 'quadrants' → 'segments'",
      });
    }
    for (const p of fmPlans) {
      changes.push({
        file: p.rel,
        description: "Rename frontmatter 'quadrant:' → 'segment:'",
      });
    }
    return { changes, backupDir: null, errors };
  }

  const backupDir = join(BACKUP_ROOT, backupTimestamp());

  if (configPlan) {
    try {
      snapshotFile(cwd, backupDir, configPlan.absPath);
      writeFileSync(configPlan.absPath, configPlan.after, "utf-8");
      changes.push({
        file: configPlan.rel,
        description: "Renamed top-level 'quadrants' → 'segments'",
      });
    } catch (err) {
      errors.push({
        file: configPlan.rel,
        message: (err as Error).message,
      });
    }
  }

  for (const p of fmPlans) {
    try {
      snapshotFile(cwd, backupDir, p.absPath);
      writeFileSync(p.absPath, p.after, "utf-8");
      changes.push({
        file: p.rel,
        description: "Renamed frontmatter 'quadrant:' → 'segment:'",
      });
    } catch (err) {
      errors.push({ file: p.rel, message: (err as Error).message });
    }
  }

  return { changes, backupDir, errors };
}
