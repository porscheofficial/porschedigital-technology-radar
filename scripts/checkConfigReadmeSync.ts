import fs from "node:fs";
import path from "node:path";
import { consola } from "consola";

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "data/config.default.json");
const readmePath = path.join(root, "README.md");
const frontmatterPath = path.join(root, "scripts/validateFrontmatter.ts");

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
): Map<string, { rawCell: string; parsed: unknown; line: number }> {
  const result = new Map<
    string,
    { rawCell: string; parsed: unknown; line: number }
  >();
  const lines = readme.split("\n");

  const isTableRow = (s: string | undefined): boolean =>
    !!s && s.trim().startsWith("|") && s.trim().endsWith("|");

  let currentNamespace = "";

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const summaryMatch = line.match(
      /<summary>.*?<code>([^<]+)<\/code>.*?<\/summary>/,
    );
    if (summaryMatch) {
      currentNamespace = summaryMatch[1] ?? "";
      i++;
      continue;
    }
    if (/<summary>.*?<strong>Root<\/strong>.*?<\/summary>/.test(line)) {
      currentNamespace = "";
      i++;
      continue;
    }
    if (line.trim() === "</details>") {
      currentNamespace = "";
      i++;
      continue;
    }
    if (isTableRow(line) && /^\s*\|[\s\-|:]+\|\s*$/.test(lines[i + 1] ?? "")) {
      const headerCells = splitRow(line);
      const defaultIdx = headerCells.findIndex((c) =>
        /default/i.test(c.trim()),
      );
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        if (defaultIdx >= 0) {
          const cells = splitRow(lines[j] ?? "");
          const keyMatch = (cells[0] ?? "").trim().match(/^`([^`]+)`$/);
          if (keyMatch && cells[defaultIdx] !== undefined) {
            const rawCell = (cells[defaultIdx] ?? "").trim();
            const fullKey = currentNamespace
              ? `${currentNamespace}.${keyMatch[1]}`
              : keyMatch[1];
            if (!result.has(fullKey)) {
              result.set(fullKey, {
                rawCell,
                parsed: parseDocumentedValue(rawCell),
                line: j + 1,
              });
            }
          }
        }
        j++;
      }
      i = j;
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

if (errors > 0) {
  consola.fatal(
    `${errors} doc-sync issue(s). Update README.md (Configuration / Front-matter tables).`,
  );
  process.exit(1);
}

consola.success(
  "README is in sync with config.default.json + frontmatter schema.",
);
