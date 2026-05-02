import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "bin/create-techradar.ts",
  },
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  splitting: false,
  dts: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
