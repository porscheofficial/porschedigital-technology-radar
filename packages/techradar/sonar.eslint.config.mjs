// SonarJS clean-code sensor — separate flat config so check:quality:sonar
// reports independently from check:arch:eslint. The architectural arm
// (eslint.config.mjs) stays surgical: bans for `as any`, ts-suppression directives,
// dangerouslySetInnerHTML escape, asset-url shape. This config layers
// SonarJS's recommended rule set (~204 rules: cognitive complexity,
// dead code, code smells, security-adjacent patterns) on top.
//
// Run via: eslint --config sonar.eslint.config.mjs src scripts
//
// See docs/decisions/0010-clean-code-harness-sonarjs.md for rationale.
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "src/components/Icons/**",
      "data/**",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "bin/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  sonarjs.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "bin/**/*.ts"],
    rules: {
      // Build-time regex on trusted markdown authored by the team. The site
      // is statically exported — these patterns never see user input at
      // runtime. ReDoS is not in this threat model. See ADR-0010.
      "sonarjs/slow-regex": "off",
      // Math.random() is used for visual blip-position jitter inside the
      // radar SVG. Not security-sensitive. See ADR-0010.
      "sonarjs/pseudo-random": "off",
      // Domain-tagged string aliases (e.g. `type Release = string`) are
      // intentional self-documentation in src/lib/types.ts. See ADR-0010.
      "sonarjs/redundant-type-aliases": "off",
    },
  },
);
