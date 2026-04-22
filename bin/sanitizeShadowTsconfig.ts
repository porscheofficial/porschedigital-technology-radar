type Tsconfig = Record<string, unknown> & { exclude?: unknown };

const SHADOW_TSCONFIG_EXCLUDES: readonly string[] = [
  "node_modules",
  "scripts/check*.ts",
  "scripts/preCommit*.ts",
  "scripts/__tests__/**",
  "src/**/__tests__/**",
  "src/**/*.test.ts",
  "src/**/*.test.tsx",
  "src/test/**",
  "bin/__tests__/**",
];

export function sanitizeShadowTsconfig(tsconfig: Tsconfig): Tsconfig {
  return { ...tsconfig, exclude: [...SHADOW_TSCONFIG_EXCLUDES] };
}
