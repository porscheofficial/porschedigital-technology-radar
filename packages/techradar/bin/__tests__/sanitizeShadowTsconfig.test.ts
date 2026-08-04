import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { sanitizeShadowTsconfig } from "../sanitizeShadowTsconfig";

// Resolves the exclude globs through TypeScript's own config parser: string
// assertions cannot catch a pattern that looks right but matches nothing.
function resolveShadowProgramFiles(relativePaths: readonly string[]): string[] {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "shadow-tsconfig-")));
  try {
    for (const relativePath of relativePaths) {
      const absolute = join(root, relativePath);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, "export const value = 1;\n");
    }

    const shadow = sanitizeShadowTsconfig({
      compilerOptions: { noEmit: true },
      include: ["**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    });

    return ts
      .parseJsonConfigFileContent(shadow, ts.sys, root)
      .fileNames.map((fileName) => fileName.slice(`${root}/`.length));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("sanitizeShadowTsconfig", () => {
  it("excludes QA-only scripts whose imports are devDependencies skipped by --omit=dev", () => {
    const result = sanitizeShadowTsconfig({
      compilerOptions: { strict: true },
      include: ["**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    }) as { exclude: string[] };

    expect(result.exclude).toContain("node_modules");
    expect(result.exclude).toContain("scripts/check*.ts");
    expect(result.exclude).toContain("scripts/preCommit*.ts");
    expect(result.exclude).toContain("scripts/record*.ts");
    expect(result.exclude).toContain("scripts/**/__tests__/**");
    expect(result.exclude).toContain("src/**/__tests__/**");
    expect(result.exclude).toContain("src/**/*.test.ts");
    expect(result.exclude).toContain("src/**/*.test.tsx");
    expect(result.exclude).toContain("src/test/**");
    expect(result.exclude).toContain("bin/__tests__/**");
  });

  it("keeps shipped test files out of the shadow type-check program", () => {
    const files = resolveShadowProgramFiles([
      "bin/techradar.ts",
      "bin/__tests__/techradar.test.ts",
      "scripts/buildData.ts",
      "scripts/__tests__/buildData.test.ts",
      "scripts/theme/__tests__/assets.test.ts",
      "src/lib/data.ts",
      "src/lib/__tests__/data.test.ts",
    ]);

    expect(files.filter((file) => file.includes("__tests__"))).toEqual([]);
    expect(files.toSorted()).toEqual([
      "bin/techradar.ts",
      "scripts/buildData.ts",
      "src/lib/data.ts",
    ]);
  });

  it("preserves compilerOptions and include unchanged", () => {
    const input = {
      compilerOptions: {
        strict: true,
        paths: { "@/*": ["./src/*"] },
        plugins: [{ name: "next" }],
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    };

    const result = sanitizeShadowTsconfig(input) as typeof input;

    expect(result.compilerOptions).toEqual(input.compilerOptions);
    expect(result.include).toEqual(input.include);
  });

  it("does not mutate the input tsconfig", () => {
    const input = {
      compilerOptions: { strict: true },
      include: ["**/*.ts"],
      exclude: ["node_modules"],
    };
    const snapshot = JSON.stringify(input);

    sanitizeShadowTsconfig(input);

    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("replaces a pre-existing exclude array rather than appending", () => {
    const result = sanitizeShadowTsconfig({
      compilerOptions: {},
      exclude: ["should-be-dropped"],
    }) as { exclude: string[] };

    expect(result.exclude).not.toContain("should-be-dropped");
  });
});
