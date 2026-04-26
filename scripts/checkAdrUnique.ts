// ADR-uniqueness sensor for the steering harness.
//
// Every file in `docs/decisions/` matching `NNNN-*.md` MUST use a unique
// 4-digit prefix. This catches the failure mode where two ADRs are authored
// in parallel (or rebased) and end up sharing a number, which silently
// breaks `See ADR-NNNN` cross-references throughout the codebase.
//
// Additionally, every ADR's `# ADR-NNNN — Title` heading must match the
// filename prefix, so renaming the file forces a heading update (and vice
// versa).
import { readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { consola } from "consola";

const argDir = process.argv[2];
const adrDir = argDir
  ? isAbsolute(argDir)
    ? argDir
    : join(process.cwd(), argDir)
  : join(process.cwd(), "docs/decisions");
const filenameRe = /^(\d{4})-[\w-]+\.md$/;
const headingRe = /^#\s*ADR-(\d{4})\b/m;

const errors: string[] = [];
const seen = new Map<string, string>();

for (const name of readdirSync(adrDir).sort()) {
  const m = name.match(filenameRe);
  if (!m) continue; // README.md and other non-ADR files
  const number = m[1];

  if (seen.has(number)) {
    errors.push(
      `Duplicate ADR number ${number}: "${seen.get(number)}" and "${name}". ` +
        `Renumber the newer file to the next free integer.`,
    );
  } else {
    seen.set(number, name);
  }

  const content = readFileSync(join(adrDir, name), "utf8");
  const h = content.match(headingRe);
  if (!h) {
    errors.push(`${name}: missing or malformed \`# ADR-NNNN\` heading.`);
  } else if (h[1] !== number) {
    errors.push(
      `${name}: heading says ADR-${h[1]} but filename prefix is ${number}. ` +
        `These must agree.`,
    );
  }
}

// Contiguity: ADRs must be numbered 0001..N with no gaps. Since ADRs are
// immutable once accepted (see docs/decisions/README.md), gaps shouldn't
// occur naturally. Enforcing contiguity also makes "pick the next number"
// unambiguous — every new ADR is `max + 1`, which makes duplicates
// impossible by construction.
const numbers = [...seen.keys()].map(Number).sort((a, b) => a - b);
for (let i = 0; i < numbers.length; i++) {
  const expected = i + 1;
  if (numbers[i] !== expected) {
    errors.push(
      `ADR numbering has a gap: expected ${String(expected).padStart(4, "0")} ` +
        `but next file is ${String(numbers[i]).padStart(4, "0")}. ` +
        `New ADRs must use the next sequential integer.`,
    );
    break;
  }
}

if (errors.length) {
  consola.error(`ADR-uniqueness check failed — ${errors.length} issue(s):`);
  for (const e of errors) consola.error(`  • ${e}`);
  consola.info(
    "Each ADR file in docs/decisions/ must have a unique 4-digit prefix " +
      "and a `# ADR-NNNN` heading that matches the prefix.",
  );
  process.exit(1);
}

consola.success(
  `ADR-uniqueness OK — ${seen.size} ADR file(s), all numbers unique.`,
);
