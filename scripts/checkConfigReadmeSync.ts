import fs from "node:fs";
import path from "node:path";
import { consola } from "consola";

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "data/config.default.json");
const readmePath = path.join(root, "README.md");
const frontmatterPath = path.join(root, "scripts/validateFrontmatter.ts");

function flattenLeafKeys(obj: unknown, prefix = ""): string[] {
  // Only emit keys whose value is a primitive (string/number/boolean/null).
  // Skips arrays entirely — array-shaped configs (quadrants, rings, social)
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

const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const readme = fs.readFileSync(readmePath, "utf8");
const frontmatter = fs.readFileSync(frontmatterPath, "utf8");

const configKeys = flattenLeafKeys(cfg);

const missingInReadme: string[] = [];
for (const key of configKeys) {
  const leaf = key.split(".").pop() ?? key;
  if (["0", "1", "2", "3", "4", "5", "6", "7"].includes(leaf)) continue;
  const pattern = new RegExp(`\`${leaf}\``);
  if (!pattern.test(readme)) missingInReadme.push(key);
}

const schemaFieldRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*):\s*z\.[a-zA-Z]/gm;
const schemaFields = [...frontmatter.matchAll(schemaFieldRegex)].map(
  (m) => m[1],
);

const missingFrontmatter: string[] = [];
for (const field of schemaFields) {
  if (!new RegExp(`\`${field}\``).test(readme)) missingFrontmatter.push(field);
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

if (errors > 0) {
  consola.fatal(
    `${errors} doc-sync issue(s). Update README.md (Configuration / Front-matter tables).`,
  );
  process.exit(1);
}

consola.success(
  "README is in sync with config.default.json + frontmatter schema.",
);
