const path = require("node:path");
const config = require("./data/config.json");

// Monorepo-aware Turbopack root resolution (Next.js 16 + pnpm workspace).
//
// Next 16's hot-reloader computes `relative(turbopackRoot, projectPath)` and
// falls back to "." when the result is empty. Setting `turbopack.root` to
// `__dirname` makes that fallback fire, which the Rust layer then misreads as
// a literal subdirectory (it walks into `src/app` and fails to resolve
// `next/package.json`). See vercel/next.js#90307 and #92540.
//
// Fix: when this package is being built INSIDE the workspace (i.e. a
// `pnpm-workspace.yaml` exists two levels up), point `turbopack.root` AND
// `outputFileTracingRoot` at the workspace root so the relative path becomes
// non-empty (`packages/techradar`) and Turbopack can find pnpm-hoisted
// dependencies via the root `node_modules`.
//
// When this package runs as a shadow build inside a CONSUMER's `.techradar/`
// directory (no `pnpm-workspace.yaml` upstream), keep both values pinned to
// `__dirname` to preserve the ADR-0023 resolution-root fence.
//
// IMPORTANT: `node:fs` must NEVER appear in this file — not even inside a
// lazy require or try/catch. Turbopack serializes next.config.js into client
// chunks and traces every `require()` call regardless of control flow.  A
// top-level or IIFE-wrapped `require("node:fs")` leaks into the browser
// bundle and crashes with "Cannot find module 'node:fs'".
//
// Monorepo detection: when running inside the pnpm workspace the package sits
// at `<root>/packages/techradar`.  In a consumer shadow-build (CLI) there is
// no such path structure, so the fallback is `__dirname` — preserving the
// ADR-0023 resolution-root fence.
const workspaceRoot = path.resolve(__dirname, "../..");
const isMonorepoContext = __dirname.endsWith(
  path.join("packages", "techradar"),
);
const turbopackRoot = isMonorepoContext ? workspaceRoot : __dirname;
const tracingRoot = isMonorepoContext ? workspaceRoot : __dirname;
const envBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath =
  envBasePath != null
    ? envBasePath && envBasePath !== "/"
      ? envBasePath
      : ""
    : config.basePath && config.basePath !== "/"
      ? config.basePath
      : "";

// Resolution-root fence (ADR-0023):
// When this package runs as a shadow build inside `<consumer>/.techradar/`,
// Node's module resolution and Next's file tracer both climb up the directory
// tree. If the consumer's outer `node_modules` happens to host a *different*
// copy of `next` or `react` (e.g. another peer dep pulling in next@15), the
// prerender worker can boot with two React runtimes — `ReactSharedInternals`
// goes null in one of them and every Context-using page crashes with
// `Cannot read properties of null (reading 'useContext')`.
//
// Pin every framework module to absolute paths under THIS directory's
// node_modules and stop file-tracing from leaving it.
const reactPath = path.resolve(__dirname, "node_modules/react");
const reactDomPath = path.resolve(__dirname, "node_modules/react-dom");
const nextPath = path.resolve(__dirname, "node_modules/next");

// Isolate dev-server output from production-build output so they never
// collide on the same `.next/` directory.
//
// MONOREPO-DEV ONLY. This split exists for the generator's own dev workflow
// (running `pnpm dev` from `packages/techradar/` inside this monorepo). The
// harness can run `pnpm build` while `pnpm dev` is alive — the dev process
// keeps open file handles inside `distDir`, and `next build` clears that dir
// at startup, so the next dev request 500s with
// `ENOENT: webpack-runtime.js`. Routing dev output to `.next-dev/` and
// keeping `.next/` for `next build` decouples the two harnesses.
//
// CONSUMER SHADOW BUILDS DO NOT NEED THIS. `<consumer>/.techradar/` is
// regenerated from a content hash and gitignored; it never runs `pnpm dev`
// and `pnpm build` concurrently against the same dir. Forcing `.next-dev/`
// there has no harm but no benefit either, so we gate on `isMonorepoContext`
// to keep the consumer path identical to a vanilla Next.js project.
//
// Next sets `NODE_ENV=development` for `next dev` and `NODE_ENV=production`
// for `next build`, so the env check is reliable. `.next-dev/` is gitignored
// and added to the eslint/tsconfig paths alongside `.next/` so it is never
// linted or type-checked.
const distDir =
  isMonorepoContext && process.env.NODE_ENV === "development"
    ? ".next-dev"
    : ".next";

// Use a dev-only tsconfig so Next's startup auto-reconfigure (which
// appends `<distDir>/types/**/*.ts` and `<distDir>/dev/types/**/*.ts` to
// `include`) writes those `.next-dev/...` paths into `tsconfig.dev.json`
// and leaves the canonical `tsconfig.json` (used by `tsc --noEmit` and
// `next build`) untouched.
//
// MONOREPO-DEV ONLY. Without this split, `next dev` rewrites `tsconfig.json`
// on every startup, and the `.next-dev/dev/types/validator.ts` it adds
// collides with `.next/types/validator.ts` during `next build` with
// `Duplicate identifier 'PagesPageConfig'`. That collision only happens in
// the generator's own monorepo workflow where both harnesses share a tree.
//
// CONSUMER SHADOW BUILDS MUST NOT TAKE THIS BRANCH. `bin/techradar.ts`
// `ensureBuildDir()` only seeds `tsconfig.json` into `<consumer>/.techradar/`
// — never `tsconfig.dev.json`. If `next dev` were pointed at the missing
// dev-tsconfig, it would fall back to its "no tsconfig found" path and
// silently write a bare `tsconfig.json` WITHOUT the `paths: { "@/*": [...] }`
// alias mapping, breaking every `@/*` import in the user's `src/` tree.
// Gate on `isMonorepoContext` so consumers always get the canonical path.
const tsconfigPath =
  isMonorepoContext && process.env.NODE_ENV === "development"
    ? "tsconfig.dev.json"
    : "tsconfig.json";

/** @type {import("next").NextConfig} */
const nextConfig = {
  basePath,
  distDir,
  typescript: { tsconfigPath },
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  outputFileTracingRoot: tracingRoot,
  allowedDevOrigins: ["**.localhost"],
  sassOptions: {
    loadPaths: [path.join(__dirname, "node_modules")],
  },
  turbopack: {
    root: turbopackRoot,
  },
  webpack: (cfg) => {
    cfg.resolve = cfg.resolve || {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias || {}),
      react: reactPath,
      "react-dom": reactDomPath,
      next: nextPath,
    };
    return cfg;
  },
};

module.exports = nextConfig;
