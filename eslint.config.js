// ESLint runs in lint-only mode for architectural invariants Biome can't express.
// Biome remains the formatter/linter for everything else.
//
// Local architectural rules:
//   1. no-asset-url-bypass — JSX href/src "/..." literals must be wrapped in assetUrl()
//   2. safe-html-required — dangerouslySetInnerHTML only inside SafeHtml.tsx
//   3. no-ts-suppression  — ban as-any / @ts-expect-error / @ts-nocheck
//
// Plus @next/eslint-plugin-next recommended (with documented exceptions):
//   - @next/next/no-img-element OFF — see docs/decisions/0003-no-next-image.md
//   - @next/next/no-html-link-for-pages OFF — our internal-link convention is
//     <Link href={assetUrl(...)}> and <a href={assetUrl(...)}>, both compatible
//     with output:"export"; the Next rule's pages-dir scan misreports here.
import nextPlugin from "@next/eslint-plugin-next";
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
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "bin/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      // 3) Forbid TS suppressions. (AGENTS.md → Hard Blocks)
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-expect-error": true,
          "ts-nocheck": true,
          "ts-check": false,
        },
      ],
      "no-restricted-syntax": [
        "error",

        // 1) Bare absolute hrefs/srcs must use assetUrl().
        //    (src/components/AGENTS.md → Links and asset URLs)
        {
          selector:
            "JSXAttribute[name.name=/^(href|src)$/] > Literal[value=/^\\/(?!\\/)/]",
          message:
            "Bare absolute href/src literal — wrap with assetUrl() from @/lib/utils.",
        },
        {
          selector:
            "JSXAttribute[name.name=/^(href|src)$/] > JSXExpressionContainer > TemplateLiteral[expressions.length>0][quasis.0.value.raw=/^\\/(?!\\/)/]",
          message:
            "Bare absolute href/src template literal — wrap with assetUrl() from @/lib/utils.",
        },

        // 3) `as any` cast.
        {
          selector: "TSAsExpression > TSAnyKeyword.typeAnnotation",
          message:
            "`as any` is forbidden. Use `unknown` and narrow, or type the value properly.",
        },
      ],
    },
  },

  // 2) dangerouslySetInnerHTML restricted to SafeHtml.tsx.
  //    Apply ban broadly, then exempt the single allowed file.
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "dangerouslySetInnerHTML is only allowed inside src/components/SafeHtml/SafeHtml.tsx. (src/components/AGENTS.md)",
        },
        {
          selector:
            "JSXAttribute[name.name=/^(href|src)$/] > Literal[value=/^\\/(?!\\/)/]",
          message:
            "Bare absolute href/src literal — wrap with assetUrl() from @/lib/utils.",
        },
        {
          selector:
            "JSXAttribute[name.name=/^(href|src)$/] > JSXExpressionContainer > TemplateLiteral[expressions.length>0][quasis.0.value.raw=/^\\/(?!\\/)/]",
          message:
            "Bare absolute href/src template literal — wrap with assetUrl() from @/lib/utils.",
        },
        {
          selector: "TSAsExpression > TSAnyKeyword.typeAnnotation",
          message:
            "`as any` is forbidden. Use `unknown` and narrow, or type the value properly.",
        },
      ],
    },
  },
  {
    files: ["src/components/SafeHtml/SafeHtml.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },

  // Tests: relax `as any` for mock factories (matches biome.jsonc override).
  {
    files: ["**/*.test.{ts,tsx}", "**/__tests__/**", "src/test/**"],
    rules: { "no-restricted-syntax": "off" },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
);
