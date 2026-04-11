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

/** @type {import("next").NextConfig} */
const nextConfig = {
  basePath,
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  sassOptions: {
    loadPaths: [path.join(__dirname, "node_modules")],
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
