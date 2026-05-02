// Doc-coverage sensor for the steering harness.
//
// Every "(Checked: …)" reference in any AGENTS.md must resolve to a real
// rule or script. This catches drift where:
//   - a doc cites a renamed/deleted dep-cruiser rule,
//   - a doc cites an architecture.test.ts test that no longer exists,
//   - a doc cites an npm script that was renamed.
//
// Recognised reference shapes inside (Checked: …):
//   `.dependency-cruiser.cjs` → `<rule-name>`
//   `architecture.test.ts`    → `<test-id>`        (matches `it("<id>: …")`)
//   `eslint.config.mjs`        → `<rule-name>`      (or bare file ref — file existence)
//   `pnpm run <script-name>`
//   `<bare-identifier>`                            (resolves against any of the above)
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { consola } from "consola";

// Tooling configs (.dependency-cruiser.cjs, eslint.config.mjs, package.json,
// architecture.test.ts) are package-rooted: this sensor MUST be invoked from
// the techradar package root via `pnpm --filter ... run check:arch:doccoverage`.
const root = process.cwd();
// Walk root for AGENTS.md discovery — defaults to the package root, but an
// optional argv[2] lets callers widen the scan to the workspace root so it
// also picks up the root AGENTS.md (lobby file) and any other package AGENTS.md.
const walkRoot = process.argv[2] ? resolve(root, process.argv[2]) : root;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const cjs = readFileSync(join(root, ".dependency-cruiser.cjs"), "utf8");
const archTest = readFileSync(
  join(root, "src/__tests__/architecture/architecture.test.ts"),
  "utf8",
);
const eslintCfg = readFileSync(join(root, "eslint.config.mjs"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

const depCruiserRules = new Set<string>();
for (const m of cjs.matchAll(/name:\s*"([^"]+)"/g)) depCruiserRules.add(m[1]);

const archTests = new Set<string>();
for (const m of archTest.matchAll(/it\("([\w-]+):/g)) archTests.add(m[1]);

const eslintRules = new Set<string>();
for (const m of eslintCfg.matchAll(/"((?:@[\w-]+\/)?[\w-]+)":\s*\[/g)) {
  eslintRules.add(m[1]);
}

const npmScripts = new Set(Object.keys(pkg.scripts ?? {}));

const agentsFiles = walk(walkRoot).filter((f) => /AGENTS\.md$/.test(f));

const errors: string[] = [];
const checkedRe = /\(Checked:\s*([^)]+?)\)/g;
const fileArrowRe =
  /`(\.?[\w./-]+\.(?:cjs|js|ts|tsx))`\s*(?:→|->)\s*`([^`]+)`/g;
const npmRe = /`pnpm run ([\w:-]+)`/g;
const bareRe = /`([a-z][a-z0-9-]+)`/g;
const knownFiles = new Set([
  ".dependency-cruiser.cjs",
  "eslint.config.mjs",
  "architecture.test.ts",
]);

function validateFileRef(srcFile: string, id: string): string | null {
  if (srcFile === ".dependency-cruiser.cjs") {
    return depCruiserRules.has(id) ? null : `dep-cruiser rule \`${id}\``;
  }
  if (srcFile === "architecture.test.ts") {
    return archTests.has(id) ? null : `architecture test \`${id}\``;
  }
  if (srcFile === "eslint.config.mjs") {
    return eslintRules.has(id) ? null : `eslint rule \`${id}\``;
  }
  return null; // unknown file ref — skip silently
}

for (const file of agentsFiles) {
  const rel = file.replace(`${walkRoot}/`, "");
  const content = readFileSync(file, "utf8");
  for (const m of content.matchAll(checkedRe)) {
    const body = m[1];
    let resolved = false;

    for (const a of body.matchAll(fileArrowRe)) {
      resolved = true;
      const err = validateFileRef(a[1], a[2]);
      if (err) errors.push(`${rel}: missing ${err}`);
    }
    for (const a of body.matchAll(npmRe)) {
      resolved = true;
      if (!npmScripts.has(a[1])) {
        errors.push(`${rel}: missing pnpm script \`${a[1]}\``);
      }
    }

    if (!resolved) {
      for (const a of body.matchAll(bareRe)) {
        const id = a[1];
        if (knownFiles.has(id)) continue;
        if (
          depCruiserRules.has(id) ||
          archTests.has(id) ||
          eslintRules.has(id) ||
          npmScripts.has(id)
        ) {
          continue;
        }
        errors.push(`${rel}: unresolved reference \`${id}\``);
      }
    }
  }
}

if (errors.length) {
  consola.error(
    `Doc-coverage check failed — ${errors.length} stale reference(s):`,
  );
  for (const e of errors) consola.error(`  • ${e}`);
  consola.info(
    "Each (Checked: …) reference in AGENTS.md must point at a live rule, " +
      "test, eslint rule, or pnpm script. Update the doc or revive the rule.",
  );
  process.exit(1);
}

consola.success(
  `Doc-coverage OK — every (Checked: …) reference across ${agentsFiles.length} AGENTS.md file(s) resolves.`,
);
