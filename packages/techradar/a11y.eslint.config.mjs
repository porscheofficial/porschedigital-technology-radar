// Source-side accessibility sensor — separate flat config so
// check:a11y:source reports independently from check:arch:eslint and
// check:quality:sonar. Layers eslint-plugin-jsx-a11y's recommended rule
// set (~35 rules: missing alt text, role-attribute mismatches,
// keyboard accessibility, label associations) on top of the JSX/TSX
// surface in src/.
//
// This is the *static* half of the a11y arm. The dynamic half
// (check:a11y:axe) runs axe-core against rendered HTML in out/ and
// catches what cannot be detected from source alone (live region
// behaviour, computed roles, post-hydration tree).
//
// Run via: eslint --config a11y.eslint.config.mjs src
//
// See docs/decisions/0018-a11y-harness.md for rationale.
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-dev/**",
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
    files: ["src/**/*.{jsx,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "jsx-a11y": jsxA11y },
    // Recommended preset — the same set of WCAG-aligned static checks
    // most React projects ship with. We do not extend to `strict`
    // because the additional rules there overlap with axe-core's
    // dynamic checks (which run against the actual rendered tree
    // and produce fewer false positives on PDS web components).
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
);
