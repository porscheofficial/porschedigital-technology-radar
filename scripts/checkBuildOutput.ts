import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { consola } from "consola";

const root = process.cwd();
const outDir = join(root, "out");

if (!existsSync(outDir)) {
  consola.error(
    "out/ does not exist. Run `npm run build` before `npm run check:build`.",
  );
  process.exit(1);
}

type Quadrant = { id: string };
type Item = { id: string; quadrant: string };
type Config = { quadrants: Quadrant[] };

const data = JSON.parse(readFileSync(join(root, "data/data.json"), "utf8")) as {
  items: Item[];
};

const defaultConfig = JSON.parse(
  readFileSync(join(root, "data/config.default.json"), "utf8"),
) as Config;
const userConfig = JSON.parse(
  readFileSync(join(root, "data/config.json"), "utf8"),
) as Partial<Config>;
const quadrants: Quadrant[] = userConfig.quadrants ?? defaultConfig.quadrants;

const expected: string[] = [
  "index.html",
  "404.html",
  "sitemap.xml",
  "history/index.html",
  "help-and-about-tech-radar/index.html",
];
for (const q of quadrants) expected.push(`${q.id}/index.html`);
for (const item of data.items) {
  expected.push(`${item.quadrant}/${item.id}/index.html`);
}

const missing = expected.filter((rel) => !existsSync(join(outDir, rel)));

if (missing.length > 0) {
  consola.error(
    `${missing.length} expected route file(s) missing from out/. ` +
      "Each entry is a route promised by data.ts + getStaticPaths but not " +
      "found in the static export. Re-run `npm run build:data && npm run build`. " +
      "(See src/pages/AGENTS.md → static-export contract.)",
  );
  for (const rel of missing) consola.error(`  out/${rel}`);
  process.exit(1);
}

consola.success(
  `out/ contains all ${expected.length} expected route files ` +
    `(${quadrants.length} quadrants, ${data.items.length} items, 5 statics).`,
);
