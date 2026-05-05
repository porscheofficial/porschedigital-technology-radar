import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { consola } from "consola";

const root = process.cwd();
const staticDir = join(root, "out", "_next", "static");

if (!existsSync(staticDir)) {
  consola.error(
    "out/_next/static/ does not exist. Run `pnpm run build` before `pnpm run check:build`.",
  );
  process.exit(1);
}

type Budget = {
  maxTotalJsBytes: number;
  maxTotalCssBytes: number;
  maxChunkBytes: number;
};

// PDS v4 migration: budget bump tracked in .sisyphus/plans/pds-v4-and-theme-mode.md.
const budget = JSON.parse(
  readFileSync(join(root, "bundle-budget.json"), "utf8"),
) as Budget;

type FileEntry = { path: string; bytes: number };

function walk(dir: string): FileEntry[] {
  const out: FileEntry[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile())
      out.push({ path: full, bytes: statSync(full).size });
  }
  return out;
}

const all = walk(staticDir);
const js = all.filter((f) => f.path.endsWith(".js"));
const css = all.filter((f) => f.path.endsWith(".css"));

const totalJs = js.reduce((n, f) => n + f.bytes, 0);
const totalCss = css.reduce((n, f) => n + f.bytes, 0);
const largest = [...js, ...css].sort((a, b) => b.bytes - a.bytes)[0];

const violations: string[] = [];
if (totalJs > budget.maxTotalJsBytes) {
  violations.push(
    `Total JS ${kb(totalJs)} > budget ${kb(budget.maxTotalJsBytes)}`,
  );
}
if (totalCss > budget.maxTotalCssBytes) {
  violations.push(
    `Total CSS ${kb(totalCss)} > budget ${kb(budget.maxTotalCssBytes)}`,
  );
}
const overChunk = [...js, ...css].filter((f) => f.bytes > budget.maxChunkBytes);
for (const f of overChunk) {
  violations.push(
    `Chunk ${relative(root, f.path)} ${kb(f.bytes)} > budget ${kb(budget.maxChunkBytes)}`,
  );
}

if (violations.length > 0) {
  consola.error(
    `Bundle budget exceeded (${violations.length} violation(s)). ` +
      "Either trim the regression or update bundle-budget.json deliberately " +
      "with a justification in the commit message. " +
      "(See docs/HARNESS.md → bundle budget.)",
  );
  for (const v of violations) consola.error(`  ${v}`);
  process.exit(1);
}

consola.success(
  `Bundle budget OK — JS ${kb(totalJs)} / ${kb(budget.maxTotalJsBytes)}, ` +
    `CSS ${kb(totalCss)} / ${kb(budget.maxTotalCssBytes)}, ` +
    `largest chunk ${kb(largest?.bytes ?? 0)} / ${kb(budget.maxChunkBytes)}.`,
);

function kb(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}
