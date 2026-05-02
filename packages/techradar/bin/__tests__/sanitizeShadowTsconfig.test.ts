import { describe, expect, it } from "vitest";
import { sanitizeShadowTsconfig } from "../sanitizeShadowTsconfig";

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
    expect(result.exclude).toContain("scripts/__tests__/**");
    expect(result.exclude).toContain("src/**/__tests__/**");
    expect(result.exclude).toContain("src/**/*.test.ts");
    expect(result.exclude).toContain("src/**/*.test.tsx");
    expect(result.exclude).toContain("src/test/**");
    expect(result.exclude).toContain("bin/__tests__/**");
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
