// Build-output accessibility sensor (see ADR-0018).
//
// Walks the static-export tree at out/ and runs axe-core against every
// emitted .html file via a jsdom virtual DOM. Catches WCAG-aligned
// violations the source-side jsx-a11y lint cannot see: computed roles,
// landmark relationships, post-render id/label associations, ARIA
// attribute combinations on the actual rendered tree.
//
// Failure policy: fail only on `impact: "serious" | "critical"`.
// Lower-severity findings (`minor`, `moderate`) are reported as info
// but do not block the build. See ADR-0018 for the rationale.
//
// Disabled rules (browser-only signals jsdom cannot provide):
//   - color-contrast            (needs computed CSS / layout)
//   - color-contrast-enhanced   (same)
//   - target-size               (needs layout dimensions)
//   - scrollable-region-focusable (needs scroll/layout)
// Plus rules whose pre-hydration view of PDS web components is noise:
//   - landmark-one-main, region, page-has-heading-one
//     (PDS shells render empty before client hydration)
//   - aria-required-parent
//     (PDS table primitives like <p-table-head>/<p-table-body> render
//      as unknown elements pre-hydration; the parent/child role chain
//      only materialises in the browser after the components upgrade.)
//   - nested-interactive
//     (the radar SVG nests <a> blip links inside an interactive container
//      by design for keyboard + tooltip semantics; the visualisation
//      cannot be flattened without losing the radar metaphor.)
//   - html-has-lang
//     (Next.js 16 emits a fallback 404 / _not-found HTML that does not
//      pass through src/pages/_document.tsx, so it lacks the lang attr.
//      The user-routed pages all set lang="en" via _document.)
//
// Wrapper uses node:child_process-free in-process execution because the
// tool is a Node library, not a CLI. Companion to scripts/checkHtmlValidate.ts.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ImpactValue, Result, RunOptions } from "axe-core";
// axe-core ships its own browser-targeted source; we eval it inside
// the JSDOM window. The node entry exposes `.source` for exactly this.
import axe from "axe-core";
import { consola } from "consola";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "out");

if (!existsSync(outDir)) {
  consola.error(
    "out/ does not exist. Run `npm run build` before `npm run check:a11y:axe`.",
  );
  process.exit(1);
}

// Severities that block the build. Per ADR-0018: serious + critical.
const blockingImpacts: ReadonlySet<ImpactValue> = new Set<ImpactValue>([
  "serious",
  "critical",
]);

// Rules disabled with rationale in the file banner above.
const disabledRules = [
  "color-contrast",
  "color-contrast-enhanced",
  "target-size",
  "scrollable-region-focusable",
  "landmark-one-main",
  "region",
  "page-has-heading-one",
  "aria-required-parent",
  "nested-interactive",
  "html-has-lang",
];

const axeOptions: RunOptions = {
  rules: Object.fromEntries(
    disabledRules.map((id) => [id, { enabled: false }]),
  ),
  // Limit to WCAG 2.1 AA + best-practice tags. Matches the bar most
  // public-sector and enterprise sites are held to.
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
  },
  resultTypes: ["violations"],
};

type FileFinding = {
  file: string;
  violations: Result[];
};

async function runAxeOnFile(htmlPath: string): Promise<Result[]> {
  const html = readFileSync(htmlPath, "utf8");
  // Silence JSDOM's noisy CSS / resource warnings — they are not what
  // this sensor checks.
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole });
  const { window } = dom;
  // Inject axe-core source into the JSDOM window so it can attach to
  // its `window.document` rather than the host's.
  window.eval(axe.source);
  const results = (await (window as unknown as { axe: typeof axe }).axe.run(
    window.document,
    axeOptions,
  )) as { violations: Result[] };
  dom.window.close();
  return results.violations;
}

function walkHtml(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, acc);
    else if (entry.isFile() && entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

type Aggregate = {
  findings: FileFinding[];
  totalBlocking: number;
  totalAdvisory: number;
};

function isBlocking(v: Result): boolean {
  return v.impact != null && blockingImpacts.has(v.impact);
}

function reportViolation(v: Result): void {
  consola.error(`    [${v.impact}] ${v.id}: ${v.help}`);
  consola.error(`      ${v.helpUrl}`);
  for (const node of v.nodes.slice(0, 3)) {
    consola.error(`      target: ${node.target.join(" ")}`);
  }
  if (v.nodes.length > 3) {
    consola.error(`      … and ${v.nodes.length - 3} more node(s)`);
  }
}

function reportFindings(agg: Aggregate): void {
  consola.error(
    `Accessibility check failed — ${agg.totalBlocking} serious/critical violation(s) across ${agg.findings.length} file(s):`,
  );
  for (const { file, violations } of agg.findings) {
    consola.error(`\n  ${file}`);
    for (const v of violations) reportViolation(v);
  }
  consola.info(
    "\nSee ADR-0018 for the failure policy and disabled-rule rationale.",
  );
}

async function aggregate(files: string[]): Promise<Aggregate> {
  const agg: Aggregate = { findings: [], totalBlocking: 0, totalAdvisory: 0 };
  for (const file of files) {
    const violations = await runAxeOnFile(file);
    if (violations.length === 0) continue;
    const blocking = violations.filter(isBlocking);
    agg.totalBlocking += blocking.length;
    agg.totalAdvisory += violations.length - blocking.length;
    if (blocking.length > 0) {
      agg.findings.push({
        file: path.relative(root, file),
        violations: blocking,
      });
    }
  }
  return agg;
}

async function main(): Promise<void> {
  const files = walkHtml(outDir);
  if (files.length === 0) {
    consola.error("No HTML files found under out/.");
    process.exit(1);
  }

  const agg = await aggregate(files);

  if (agg.totalAdvisory > 0) {
    consola.info(
      `${agg.totalAdvisory} non-blocking a11y finding(s) (impact: minor/moderate). Not failing per ADR-0018.`,
    );
  }

  if (agg.findings.length > 0) {
    reportFindings(agg);
    process.exit(1);
  }

  consola.success(
    `Accessibility check OK — ${files.length} HTML file(s) scanned, no serious/critical violations.`,
  );
}

main().catch((err) => {
  consola.error(err);
  process.exit(1);
});
