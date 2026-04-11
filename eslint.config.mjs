import coreWebVitals from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...coreWebVitals,
  { rules: { "@next/next/no-img-element": "off" } },
];

export default eslintConfig;
