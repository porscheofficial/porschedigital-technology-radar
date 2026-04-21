import fs from "node:fs";
import path from "node:path";
import { consola } from "consola";

const root = path.resolve(__dirname, "..");
const buildDataPath = path.join(root, "scripts/buildData.ts");
const source = fs.readFileSync(buildDataPath, "utf8");

const errors: string[] = [];

if (!/from\s+["']rehype-sanitize["']/.test(source)) {
  errors.push("rehype-sanitize is not imported in scripts/buildData.ts.");
}

if (!/\.use\(rehypeSanitize\b/.test(source)) {
  errors.push(
    "rehypeSanitize is imported but never wired into the unified pipeline.",
  );
}

const wiringOrder = source.match(
  /\.use\(remarkRehype[^)]*\)\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*\.use\(rehypeSanitize\b/,
);
if (!wiringOrder) {
  errors.push(
    "rehypeSanitize must run immediately after remarkRehype so raw-HTML stripping happens before anchor-rewriting plugins. See ADR-0006.",
  );
}

if (/allowDangerousHtml\s*:\s*true/.test(source)) {
  errors.push(
    "remarkRehype is configured with allowDangerousHtml: true, which bypasses the sanitize boundary. Remove the option or extend the sanitize schema deliberately.",
  );
}

if (errors.length > 0) {
  consola.error("Markdown-to-HTML sanitize boundary is broken:");
  for (const e of errors) consola.error(`  - ${e}`);
  consola.fatal(
    "Sanitize boundary regressed. See docs/decisions/0006-security-harness.md and scripts/AGENTS.md.",
  );
  process.exit(1);
}

consola.success(
  "rehype-sanitize is wired correctly in scripts/buildData.ts (defense-in-depth boundary intact).",
);
