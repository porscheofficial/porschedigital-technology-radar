import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const sensor = join(repoRoot, "scripts/checkAdrUnique.ts");

let workdir: string;

function runSensor(): { code: number; output: string } {
  // execFileSync with arg array (no shell) — avoids shell-command-injection (CodeQL js/shell-command-injection-from-environment).
  try {
    const stdout = execFileSync(
      "pnpm",
      ["exec", "tsx", sensor, join(workdir, "docs/decisions")],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    return { code: 0, output: stdout };
  } catch (e) {
    const err = e as { status: number; stderr: string; stdout: string };
    return { code: err.status, output: `${err.stdout}${err.stderr}` };
  }
}

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "adr-sensor-"));
  mkdirSync(join(workdir, "docs/decisions"), { recursive: true });
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe("checkAdrUnique sensor", () => {
  it("passes when all ADR numbers are unique and headings match filenames", () => {
    writeFileSync(
      join(workdir, "docs/decisions/0001-foo.md"),
      "# ADR-0001 — Foo\n",
    );
    writeFileSync(
      join(workdir, "docs/decisions/0002-bar.md"),
      "# ADR-0002 — Bar\n",
    );
    expect(runSensor().code).toBe(0);
  });

  it("fails when two ADR files share a number (the bug this prevents)", () => {
    writeFileSync(
      join(workdir, "docs/decisions/0025-first.md"),
      "# ADR-0025 — First\n",
    );
    writeFileSync(
      join(workdir, "docs/decisions/0025-second.md"),
      "# ADR-0025 — Second\n",
    );
    const r = runSensor();
    expect(r.code).toBe(1);
    expect(r.output).toMatch(/Duplicate ADR number 0025/);
  });

  it("fails when an ADR's heading does not match its filename prefix", () => {
    writeFileSync(
      join(workdir, "docs/decisions/0007-foo.md"),
      "# ADR-0042 — Mismatched heading\n",
    );
    const r = runSensor();
    expect(r.code).toBe(1);
    expect(r.output).toMatch(/heading says ADR-0042.*prefix is 0007/);
  });

  it("fails when ADR numbering has a gap (forces next = max+1)", () => {
    writeFileSync(
      join(workdir, "docs/decisions/0001-a.md"),
      "# ADR-0001 — A\n",
    );
    writeFileSync(
      join(workdir, "docs/decisions/0002-b.md"),
      "# ADR-0002 — B\n",
    );
    writeFileSync(
      join(workdir, "docs/decisions/0004-d.md"),
      "# ADR-0004 — D (skipped 0003)\n",
    );
    const r = runSensor();
    expect(r.code).toBe(1);
    expect(r.output).toMatch(/gap.*expected 0003.*next file is 0004/);
  });
});
