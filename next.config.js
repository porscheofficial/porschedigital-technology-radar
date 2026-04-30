const path = require("node:path");
const config = require("./data/config.json");
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

/** @type {import("next").NextConfig} */
const nextConfig = {
  basePath,
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  allowedDevOrigins: ["**.localhost"],
  sassOptions: {
    loadPaths: [path.join(__dirname, "node_modules")],
  },
  turbopack: {
    root: __dirname,
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
