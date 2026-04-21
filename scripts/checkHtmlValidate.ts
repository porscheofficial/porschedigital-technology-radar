// HTML markup validation sensor (see ADR-0014).
//
// Walks the static-export tree at out/ and runs html-validate against
// every emitted .html file. Catches: unclosed tags, duplicate ids,
// invalid attribute values, accessibility-adjacent structural defects.
// Wired into `check:build` because it depends on `next build` having
// produced out/.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { consola } from "consola";

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "out");
const binPath = path.join(root, "node_modules/.bin/html-validate");

if (!existsSync(outDir)) {
  consola.error(
    "out/ does not exist. Run `npm run build` before `npm run check:build:html`.",
  );
  process.exit(1);
}

const result = spawnSync(
  binPath,
  ["--config", ".htmlvalidate.json", "out/**/*.html"],
  { cwd: root, stdio: "inherit" },
);

if (result.status !== 0) {
  consola.error("HTML markup validation failed. See ADR-0014.");
  process.exit(1);
}

consola.success("HTML markup validation OK.");
