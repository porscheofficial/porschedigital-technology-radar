import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

describe("architecture invariants (filesystem)", () => {
  it("pages-no-test-files: src/pages contains no .test.tsx files (Turbopack treats them as routes)", () => {
    const offenders = walk(join(root, "src/pages")).filter((f) =>
      /\.test\.tsx?$/.test(f),
    );
    expect(offenders, "Move test files to src/__tests__/pages/").toEqual([]);
  });

  it("app-router-only-sitemap: src/app contains only sitemap.ts (excluding tests)", () => {
    const files = walk(join(root, "src/app")).filter(
      (f) =>
        !/[/\\]__tests__[/\\]/.test(f) &&
        !/\.test\.tsx?$/.test(f) &&
        !/AGENTS\.md$/.test(f),
    );
    const allowed = new Set([join(root, "src/app/sitemap.ts")]);
    const offenders = files.filter((f) => !allowed.has(f));
    expect(
      offenders,
      "src/app is reserved for the lone sitemap.ts exception (see src/app/AGENTS.md)",
    ).toEqual([]);
  });

  it("component-folder-shape: every src/components/<Name>/ folder has Name.tsx", () => {
    const componentsDir = join(root, "src/components");
    const skip = new Set(["Icons"]);
    const missing: string[] = [];
    for (const entry of readdirSync(componentsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || skip.has(entry.name)) continue;
      const expected = join(componentsDir, entry.name, `${entry.name}.tsx`);
      if (!existsSync(expected) || !statSync(expected).isFile()) {
        missing.push(expected);
      }
    }
    expect(missing).toEqual([]);
  });

  it("no-pages-api: pages/api/ does not exist (static export)", () => {
    expect(existsSync(join(root, "src/pages/api"))).toBe(false);
  });

  it("no-middleware: middleware.ts does not exist (static export)", () => {
    expect(existsSync(join(root, "src/middleware.ts"))).toBe(false);
    expect(existsSync(join(root, "middleware.ts"))).toBe(false);
  });
});
