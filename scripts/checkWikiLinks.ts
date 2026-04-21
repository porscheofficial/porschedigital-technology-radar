// Wiki-link integrity sensor (see ADR-0012).
//
// `scripts/buildData.ts --strict` already aborts on unresolved [[id]] links,
// but only as a side effect of the full data build (which writes
// data/data.json). This sensor is the lightweight, source-only equivalent:
// it walks data/radar/**/*.md, regex-extracts every wiki-link token, and
// validates each against the blip lookup that buildData would compute.
//
// Idempotent — does not write any files. Safe to wire into `check:arch`.
//
// Why a separate script (not just `npm run build:data -- --strict`):
//   - check:arch must be source-only (no build-output side effects). A
//     sensor that mutates data/data.json violates the four-arm separation
//     documented in docs/HARNESS.md §2.
//   - buildData.ts pulls in the entire unified pipeline (rehype-sanitize,
//     highlight, etc.) for ~5x the wall-clock cost of the regex scan here.
import fs from "node:fs";
import path from "node:path";
import { consola } from "consola";
import { preScanBlipLookup } from "./buildData";

const root = path.resolve(__dirname, "..");
const radarDir = path.join(root, "data/radar");

const WIKI_LINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;

const lookup = preScanBlipLookup(radarDir);
const errors: string[] = [];
let scanned = 0;

function walk(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      scanned++;
      const content = fs.readFileSync(full, "utf8");
      const rel = path.relative(root, full);
      for (const m of content.matchAll(WIKI_LINK_RE)) {
        const id = m[1].trim();
        if (!lookup.has(id)) {
          errors.push(`${rel}: unresolved [[${id}]]`);
        }
      }
    }
  }
}

walk(radarDir);

if (errors.length) {
  consola.error(`Wiki-link integrity check failed — ${errors.length} broken:`);
  for (const e of errors) consola.error(`  • ${e}`);
  consola.info(
    "Every [[id]] / [[id|label]] must resolve to a known radar item id " +
      "(filename of a .md under data/radar/<release>/). Fix the typo or add " +
      "the missing item. See ADR-0012 and data/AGENTS.md.",
  );
  process.exit(1);
}

consola.success(
  `Wiki-link integrity OK — scanned ${scanned} markdown file(s) against ${lookup.size} known blip id(s).`,
);
