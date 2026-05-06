import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const PACKAGE_ROOT = path.resolve(__dirname, "..", "..");
const REAL_NEXT_CONFIG = path.join(PACKAGE_ROOT, "next.config.js");
const REAL_CONFIG_JSON = path.join(PACKAGE_ROOT, "data", "config.json");

function loadConfig(
  cwd: string,
  nodeEnv: "development" | "production",
): { distDir: string; tsconfigPath: string } {
  const child = spawnSync(
    process.execPath,
    [
      "-e",
      `const c = require(${JSON.stringify(path.join(cwd, "next.config.js"))}); ` +
        "process.stdout.write(JSON.stringify({" +
        "distDir: c.distDir, " +
        "tsconfigPath: c.typescript.tsconfigPath" +
        "}));",
    ],
    {
      cwd,
      env: { ...process.env, NODE_ENV: nodeEnv },
      encoding: "utf8",
    },
  );
  if (child.status !== 0) {
    throw new Error(
      `child exited ${child.status}: ${child.stderr || child.stdout}`,
    );
  }
  return JSON.parse(child.stdout);
}

describe("next.config.js execution-context gates", () => {
  let consumerDir: string;

  beforeEach(() => {
    const tmp = mkdtempSync(path.join(tmpdir(), "techradar-consumer-"));
    consumerDir = path.join(tmp, ".techradar");
    mkdirSync(path.join(consumerDir, "data"), { recursive: true });
    copyFileSync(REAL_NEXT_CONFIG, path.join(consumerDir, "next.config.js"));
    copyFileSync(
      REAL_CONFIG_JSON,
      path.join(consumerDir, "data", "config.json"),
    );
  });

  afterEach(() => {
    rmSync(path.dirname(consumerDir), { recursive: true, force: true });
  });

  it("consumer dev build uses canonical tsconfig.json (regression: missing tsconfig.dev.json broke @/* imports)", () => {
    const cfg = loadConfig(consumerDir, "development");
    expect(cfg.tsconfigPath).toBe("tsconfig.json");
  });

  it("consumer dev build uses .next distDir (no harness collision concern outside the monorepo)", () => {
    const cfg = loadConfig(consumerDir, "development");
    expect(cfg.distDir).toBe(".next");
  });

  it("consumer prod build uses canonical paths", () => {
    const cfg = loadConfig(consumerDir, "production");
    expect(cfg.tsconfigPath).toBe("tsconfig.json");
    expect(cfg.distDir).toBe(".next");
  });

  it("monorepo dev build keeps the dev-only split (.next-dev + tsconfig.dev.json)", () => {
    expect(existsSync(REAL_NEXT_CONFIG)).toBe(true);
    const cfg = loadConfig(PACKAGE_ROOT, "development");
    expect(cfg.tsconfigPath).toBe("tsconfig.dev.json");
    expect(cfg.distDir).toBe(".next-dev");
  });

  it("monorepo prod build uses canonical paths", () => {
    const cfg = loadConfig(PACKAGE_ROOT, "production");
    expect(cfg.tsconfigPath).toBe("tsconfig.json");
    expect(cfg.distDir).toBe(".next");
  });
});
