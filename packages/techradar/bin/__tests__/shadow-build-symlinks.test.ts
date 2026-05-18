import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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
