import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin/techradar.ts"],
  format: ["cjs"],
  target: "node18",
  outDir: "dist/bin",
  clean: true,
  splitting: false,
  dts: false,
  // Bundle ALL dependencies into the output — consumers won't have
  // citty, consola, execa, or chokidar installed.
  noExternal: [/.*/],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
