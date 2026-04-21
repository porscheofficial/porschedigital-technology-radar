import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  css: { postcss: {} },
  test: {
    environment: "jsdom",
    globals: true,
    css: { modules: { classNameStrategy: "non-scoped" } },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.*",
        "src/test/**",
        "src/components/Icons/**",
        "src/pages/_document.tsx",
        "src/pages/_app.tsx",
      ],
      thresholds: {
        lines: 55,
        functions: 60,
        statements: 55,
        branches: 55,
      },
    },
  },
});
