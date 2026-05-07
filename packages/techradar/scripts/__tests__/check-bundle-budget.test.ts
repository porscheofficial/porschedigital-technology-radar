import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const packageRoot = process.cwd();
const sensor = path.join(packageRoot, "scripts/check-bundle-budget.ts");

let workdir: string;

function runSensor(args: string[] = []): { code: number; output: string } {
  const result = spawnSync("pnpm", ["exec", "tsx", sensor, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
    env: { ...process.env, BUNDLE_BUDGET_ROOT: workdir },
  });

  return {
    code: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function writeChunk(name: string, content: string): void {
  const fullPath = path.join(workdir, ".next/static/chunks", name);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function gzipBytesFor(value: string): number {
  return gzipSync(Buffer.from(value)).length;
}

beforeEach(() => {
  workdir = mkdtempSync(path.join(tmpdir(), "bundle-budget-"));
  mkdirSync(path.join(workdir, ".next/static/chunks"), { recursive: true });
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe("check-bundle-budget sensor", () => {
  it("writes the initial baseline and exits 0 when none exists", () => {
    writeChunk("main.js", "console.log('hello');");

    const result = runSensor();
    const baselinePath = path.join(workdir, ".bundle-baseline.json");

    expect(result.code).toBe(0);
    expect(existsSync(baselinePath)).toBe(true);
    expect(JSON.parse(readFileSync(baselinePath, "utf8"))).toHaveProperty(
      "totalGzipBytes",
    );
  });

  it("fails when gzipped bundle size grows by at least 5%", () => {
    writeChunk("main.js", "console.log('hello');");
    writeChunk("regression.js", "x".repeat(20_000));

    const baselineBytes = gzipBytesFor("console.log('hello');") - 1;
    writeFileSync(
      path.join(workdir, ".bundle-baseline.json"),
      `${JSON.stringify({ totalGzipBytes: baselineBytes }, null, 2)}\n`,
      "utf8",
    );

    const result = runSensor();

    expect(result.code).toBe(1);
    expect(result.output).toContain("REGRESSION:");
    expect(result.output).toContain("growth");
  });

  it("updates the baseline when --update-baseline is passed", () => {
    writeChunk("main.js", "console.log('hello');");
    writeFileSync(
      path.join(workdir, ".bundle-baseline.json"),
      `${JSON.stringify({ totalGzipBytes: 1 }, null, 2)}\n`,
      "utf8",
    );

    const result = runSensor(["--update-baseline"]);
    const baseline = JSON.parse(
      readFileSync(path.join(workdir, ".bundle-baseline.json"), "utf8"),
    ) as { totalGzipBytes: number };

    expect(result.code).toBe(0);
    expect(baseline.totalGzipBytes).toBeGreaterThan(1);
  });

  it("includes chunks in subdirectories (pages/, polyfills/) in the total", () => {
    writeChunk("main.js", "console.log('top');");
    writeChunk("pages/index.js", "console.log('page');");
    writeChunk("polyfills/polyfill.js", "console.log('poly');");

    const topLevelOnly = gzipBytesFor("console.log('top');");
    writeFileSync(
      path.join(workdir, ".bundle-baseline.json"),
      `${JSON.stringify({ totalGzipBytes: topLevelOnly * 10 }, null, 2)}\n`,
      "utf8",
    );

    const passResult = runSensor();
    expect(passResult.code).toBe(0);

    const total =
      gzipBytesFor("console.log('top');") +
      gzipBytesFor("console.log('page');") +
      gzipBytesFor("console.log('poly');");
    writeFileSync(
      path.join(workdir, ".bundle-baseline.json"),
      `${JSON.stringify({ totalGzipBytes: Math.floor(total * 0.9) }, null, 2)}\n`,
      "utf8",
    );

    const regressResult = runSensor();
    expect(regressResult.code).toBe(1);
    expect(regressResult.output).toContain("REGRESSION:");
  });
});
