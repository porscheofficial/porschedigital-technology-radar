import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { consola } from "consola";

type BundleBaseline = {
  totalGzipBytes: number;
};

const packageRoot = process.env.BUNDLE_BUDGET_ROOT ?? process.cwd();
const chunksDir = path.join(packageRoot, ".next", "static", "chunks");
const baselinePath = path.join(packageRoot, ".bundle-baseline.json");
const growthThreshold = 0.05;
const shouldUpdateBaseline = process.argv.includes("--update-baseline");

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatPct(ratio: number): string {
  return (ratio * 100).toFixed(2);
}

function readBaseline(filePath: string): BundleBaseline {
  return JSON.parse(readFileSync(filePath, "utf8")) as BundleBaseline;
}

function writeBaseline(filePath: string, totalGzipBytes: number): void {
  writeFileSync(
    filePath,
    `${JSON.stringify({ totalGzipBytes }, null, 2)}\n`,
    "utf8",
  );
}

function getChunkPaths(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function getTotalGzipBytes(directory: string): number {
  return getChunkPaths(directory).reduce(
    (total, chunkPath) => total + gzipSync(readFileSync(chunkPath)).length,
    0,
  );
}

if (!existsSync(chunksDir)) {
  consola.error(
    ".next/static/chunks does not exist. Run `pnpm run build` before this sensor.",
  );
  process.exit(1);
}

const totalGzipBytes = getTotalGzipBytes(chunksDir);

if (!existsSync(baselinePath)) {
  writeBaseline(baselinePath, totalGzipBytes);
  consola.info(
    `INIT: wrote bundle baseline (${formatKb(totalGzipBytes)}) to .bundle-baseline.json`,
  );
  process.exit(0);
}

if (shouldUpdateBaseline) {
  writeBaseline(baselinePath, totalGzipBytes);
  consola.info(
    `Updated bundle baseline to ${formatKb(totalGzipBytes)} in .bundle-baseline.json`,
  );
  process.exit(0);
}

const baseline = readBaseline(baselinePath);

let growthRatio = 0;

if (baseline.totalGzipBytes === 0) {
  growthRatio = totalGzipBytes > 0 ? Number.POSITIVE_INFINITY : 0;
} else {
  growthRatio =
    (totalGzipBytes - baseline.totalGzipBytes) / baseline.totalGzipBytes;
}

if (growthRatio >= growthThreshold) {
  consola.error(
    `REGRESSION: ${formatPct(growthRatio)}% growth ` +
      `(current=${formatKb(totalGzipBytes)} baseline=${formatKb(baseline.totalGzipBytes)})`,
  );
  process.exit(1);
}

consola.info(
  `Bundle budget OK: current=${formatKb(totalGzipBytes)} baseline=${formatKb(baseline.totalGzipBytes)} growth=${formatPct(growthRatio)}%`,
);
