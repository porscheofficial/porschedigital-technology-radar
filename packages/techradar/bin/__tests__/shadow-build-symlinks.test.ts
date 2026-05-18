import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const BIN_SOURCE = readFileSync(path.resolve("bin", "techradar.ts"), "utf8");

describe("shadow build dereferences symlinks (ADR-0033)", () => {
  it("passes dereference: true to cpSync(SOURCE_DIR, BUILDER_DIR)", () => {
    // Match cpSync call across multiple lines without the `s` flag (which
    // requires ES2018+). `[\s\S]` is the portable any-char equivalent.
    expect(BIN_SOURCE).toMatch(
      /cpSync\(SOURCE_DIR,\s*BUILDER_DIR,\s*\{[\s\S]*?dereference:\s*true/,
    );
  });

  it("keeps the nested-node_modules filter (ADR-0024)", () => {
    expect(BIN_SOURCE).toMatch(
      /filter:\s*\(src\)\s*=>\s*!src\.includes\(`\$\{PACKAGE_NAME\}\/node_modules`\)/,
    );
  });
});

describe("consumer-build scripts must not use the @/ path alias", () => {
  const SCRIPTS_DIR = path.resolve("scripts");

  function collectScripts(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__") continue;
        out.push(...collectScripts(full));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".ts")) {
        out.push(full);
      }
    }
    return out;
  }

  const scripts = collectScripts(SCRIPTS_DIR);

  it.each(scripts)("%s has no @/ imports", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(/from\s+["']@\//);
  });
});
