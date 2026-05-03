import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { consola } from "consola";

const root = process.cwd();
const chunksDir = join(root, "out", "_next", "static", "chunks");

if (!existsSync(chunksDir)) {
  consola.error(
    "out/_next/static/chunks/ does not exist. Run `pnpm run build` before `pnpm run check:build`.",
  );
  process.exit(1);
}

const BANNED_PATTERN =
  /Cannot find module '(node:[^']+)': Unsupported external type/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith(".js")) out.push(full);
  }
  return out;
}

const files = walk(chunksDir);
const violations: { file: string; modules: string[] }[] = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const modules = new Set<string>();
  for (
    let match = BANNED_PATTERN.exec(content);
    match !== null;
    match = BANNED_PATTERN.exec(content)
  ) {
    modules.add(match[1]);
  }
  if (modules.size > 0) {
    violations.push({ file: relative(root, file), modules: [...modules] });
  }
}

if (violations.length > 0) {
  consola.error(
    `Node.js built-in modules leaked into ${violations.length} client chunk(s). ` +
      "This causes 'Cannot find module' crashes in the browser. " +
      "The most common source is a top-level require() in next.config.js — " +
      "Turbopack serialises config into client chunks. " +
      "Use path-based heuristics or env vars instead of node:fs in config files.",
  );
  for (const v of violations) {
    consola.error(`  ${v.file}: ${v.modules.join(", ")}`);
  }
  process.exit(1);
}

consola.success(
  `No Node.js built-ins in client chunks — scanned ${files.length} JS file(s).`,
);
