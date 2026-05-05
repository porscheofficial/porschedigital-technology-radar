import fs from "node:fs";
import path from "node:path";
import { consola } from "consola";

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "data/config.default.json");
const readmePath = path.join(root, "README.md");
const frontmatterPath = path.join(root, "scripts/validateFrontmatter.ts");
const themesPath = path.join(root, "data/themes.generated.json");

function flattenLeafKeys(obj: unknown, prefix = ""): string[] {
  // Only emit keys whose value is a primitive (string/number/boolean/null).
  // Skips arrays entirely — array-shaped configs (segments, rings, social)
  // are documented structurally in README, not key-by-key.
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenLeafKeys(v, key));
    } else if (!Array.isArray(v)) {
      out.push(key);
    }
  }
  return out;
}

function flattenLeafEntries(
  obj: unknown,
  prefix = "",
): Array<[string, unknown]> {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return [];
  const out: Array<[string, unknown]> = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenLeafEntries(v, key));
    } else if (!Array.isArray(v)) {
      out.push([key, v]);
    }
  }
  return out;
}

type DocumentedDefault = { rawCell: string; parsed: unknown; line: number };

const isTableRow = (s: string | undefined): boolean =>
  !!s && s.trim().startsWith("|") && s.trim().endsWith("|");

const isSeparatorRow = (s: string | undefined): boolean =>
  /^\s*\|[\s\-|:]+\|\s*$/.test(s ?? "");

/** Detect namespace from `<details><summary>` blocks. Returns `undefined` for non-namespace lines. */
function detectNamespace(line: string): string | undefined {
  const codeMatch = line.match(
    /<summary>.*?<code>([^<]+)<\/code>.*?<\/summary>/,
  );
  if (codeMatch) return codeMatch[1] ?? "";
  if (/<summary>.*?<strong>Root<\/strong>.*?<\/summary>/.test(line)) return "";
  if (line.trim() === "</details>") return "";
  return undefined;
}

/** Extract default entries from a single markdown table starting at headerIdx. */
function extractTableDefaults(
  lines: string[],
  headerIdx: number,
  namespace: string,
  result: Map<string, DocumentedDefault>,
): number {
  const headerCells = splitRow(lines[headerIdx] ?? "");
  const defaultIdx = headerCells.findIndex((c) => /default/i.test(c.trim()));
  let j = headerIdx + 2;
  while (j < lines.length && isTableRow(lines[j])) {
    if (defaultIdx >= 0) {
      collectRowDefault(lines[j] ?? "", j, defaultIdx, namespace, result);
    }
    j++;
  }
  return j;
}

/** Parse a single table row and add its default entry if present. */
function collectRowDefault(
  row: string,
  rowIdx: number,
  defaultIdx: number,
  namespace: string,
  result: Map<string, DocumentedDefault>,
): void {
  const cells = splitRow(row);
  const keyMatch = (cells[0] ?? "").trim().match(/^`([^`]+)`$/);
  if (!keyMatch || cells[defaultIdx] === undefined) return;
  const rawCell = (cells[defaultIdx] ?? "").trim();
  const fullKey = namespace ? `${namespace}.${keyMatch[1]}` : keyMatch[1];
  if (!result.has(fullKey)) {
    result.set(fullKey, {
      rawCell,
      parsed: parseDocumentedValue(rawCell),
      line: rowIdx + 1,
    });
  }
}

/**
 * Parse all markdown tables in README and build a map of documented defaults
 * keyed by namespace-qualified path (e.g. "labels.searchPlaceholder").
 *
 * Each `<details>` block in README has a `<summary>` that names the config
 * namespace it documents (e.g. `<code>labels</code>` → "labels"). Tables under
 * `<strong>Root</strong>` use no prefix. Tables outside any `<details>` (the
 * front-matter table) also use no prefix. This namespacing avoids collisions
 * between leaf keys that exist in multiple sections (e.g. `imprint` exists at
 * root as a URL AND in `labels` as a label string).
 *
 * Default cells are JSON-parsed when possible, falling back to the raw stripped
 * string for unquoted tokens like `/` or `#FBFCFF`.
 */
function parseDocumentedDefaults(
  readme: string,
): Map<string, DocumentedDefault> {
  const result = new Map<string, DocumentedDefault>();
  const lines = readme.split("\n");
  let currentNamespace = "";

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const ns = detectNamespace(line);
    if (ns !== undefined) {
      currentNamespace = ns;
      i++;
      continue;
    }
    if (isTableRow(line) && isSeparatorRow(lines[i + 1])) {
      i = extractTableDefaults(lines, i, currentNamespace, result);
      continue;
    }
    i++;
  }

  return result;
}

function splitRow(row: string): string[] {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
}

/**
 * Parse a documented default cell into a comparable value.
 *
 * Examples:
 *   `"hello"`  -> "hello"        (JSON-parsed string)
 *   `0.06`     -> 0.06           (JSON-parsed number)
 *   `true`     -> true           (JSON-parsed boolean)
 *   `""`       -> ""             (JSON-parsed empty string)
 *   `/`        -> "/"            (raw string, JSON.parse fails)
 *   `#FBFCFF`  -> "#FBFCFF"      (raw string, JSON.parse fails)
 */
function parseDocumentedValue(cell: string): unknown {
  const m = cell.match(/^`(.*)`$/);
  if (!m) return cell;
  const inner = m[1] ?? "";
  try {
    return JSON.parse(inner);
  } catch {
    return inner;
  }
}

const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const readme = fs.readFileSync(readmePath, "utf8");
const frontmatter = fs.readFileSync(frontmatterPath, "utf8");

const configKeys = flattenLeafKeys(cfg);
const configEntries = flattenLeafEntries(cfg);
const documentedDefaults = parseDocumentedDefaults(readme);

const missingInReadme: string[] = [];
for (const key of configKeys) {
  const leaf = key.split(".").pop() ?? key;
  if (["0", "1", "2", "3", "4", "5", "6", "7"].includes(leaf)) continue;
  const pattern = new RegExp(`\`${leaf}\``);
  if (!pattern.test(readme)) missingInReadme.push(key);
}

const schemaFieldRegex = /^\s*([a-zA-Z_]\w*):\s*z\.[a-zA-Z]/gm;
const schemaFields = [...frontmatter.matchAll(schemaFieldRegex)].map(
  (m) => m[1],
);

const missingFrontmatter: string[] = [];
for (const field of schemaFields) {
  if (!new RegExp(`\`${field}\``).test(readme)) missingFrontmatter.push(field);
}

// Default-value drift: every leaf key documented WITH a default cell must
// match the actual value in config.default.json. Keys that are not documented
// with a default (e.g. items under `flags`, where defaults vary per flag and
// are documented structurally) are silently skipped — this check enforces
// "if you wrote a default, it must be correct", not "every key must have a
// documented default".
const driftedDefaults: Array<{
  key: string;
  documented: { rawCell: string; line: number };
  actual: unknown;
}> = [];

for (const [key, value] of configEntries) {
  const doc = documentedDefaults.get(key);
  if (!doc) continue;
  const actualStr = String(value);
  const documentedStr = String(doc.parsed);
  if (actualStr !== documentedStr) {
    driftedDefaults.push({
      key,
      documented: { rawCell: doc.rawCell, line: doc.line },
      actual: value,
    });
  }
}

let themeDriftMsg = "";
try {
  const themesRaw = fs.readFileSync(themesPath, "utf8");
  const themesData = JSON.parse(themesRaw) as Array<{
    id: string;
    label: string;
    supports: string[];
    default: string;
  }>;
  themesData.sort((a, b) => a.id.localeCompare(b.id));

  let expectedThemesTable =
    "| ID | Label | Supported Modes | Default |\n|---|---|---|---|\n";
  for (const t of themesData) {
    expectedThemesTable += `| \`${t.id}\` | ${t.label} | \`${t.supports.join(", ")}\` | \`${t.default}\` |\n`;
  }
  expectedThemesTable = expectedThemesTable.trim();

  const themeStart = "<!-- THEMES:START -->";
  const themeEnd = "<!-- THEMES:END -->";

  const startIdx = readme.indexOf(themeStart);
  const endIdx = readme.indexOf(themeEnd);

  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    themeDriftMsg = `Missing or invalid sentinel comments ${themeStart} and ${themeEnd} in README.md`;
  } else {
    const actualThemesTable = readme
      .substring(startIdx + themeStart.length, endIdx)
      .trim();
    if (actualThemesTable !== expectedThemesTable) {
      themeDriftMsg = `Themes table in README does not match generated themes.\nExpected:\n${expectedThemesTable}\n\nFound:\n${actualThemesTable}`;
    }
  }
} catch {
  themeDriftMsg = `Could not read ${themesPath}. Did you run build:data?`;
}

let errors = 0;
if (missingInReadme.length > 0) {
  consola.error("Config keys missing from README:");
  for (const k of missingInReadme) consola.error(`  - ${k}`);
  errors += missingInReadme.length;
}
if (missingFrontmatter.length > 0) {
  consola.error("Frontmatter schema fields missing from README:");
  for (const f of missingFrontmatter) consola.error(`  - ${f}`);
  errors += missingFrontmatter.length;
}
if (driftedDefaults.length > 0) {
  consola.error(
    "Documented defaults in README do not match data/config.default.json:",
  );
  for (const d of driftedDefaults) {
    consola.error(
      `  - ${d.key}: README:${d.documented.line} says ${d.documented.rawCell}, actual is ${JSON.stringify(d.actual)}`,
    );
  }
  errors += driftedDefaults.length;
}
if (themeDriftMsg) {
  consola.error("Themes documentation drift:");
  consola.error(`  - ${themeDriftMsg}`);
  errors += 1;
}

if (errors > 0) {
  consola.fatal(
    `${errors} doc-sync issue(s). Update README.md (Configuration / Front-matter tables).`,
  );
  process.exit(1);
}

consola.success(
  "README is in sync with config.default.json + frontmatter schema.",
);
