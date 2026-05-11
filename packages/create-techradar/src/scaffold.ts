import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";

import { ScaffoldError } from "./errors.ts";

const IGNORED_ENTRIES = new Set([".git", ".DS_Store", "Thumbs.db"]);

const VALID_NPM_NAME =
  /^(?:@[a-z0-9-_~][a-z0-9-_.~]*\/)?[a-z0-9-_~][a-z0-9-_.~]*$/;

export interface ResolvedTarget {
  absolutePath: string;
  projectName: string;
  created: boolean;
}

export function isDirectoryUsable(absolutePath: string): boolean {
  if (!existsSync(absolutePath)) return true;
  const entries = readdirSync(absolutePath).filter(
    (entry) => !IGNORED_ENTRIES.has(entry),
  );
  return entries.length === 0;
}

export function deriveProjectName(rawName: string): string {
  const cleaned = rawName.trim().toLowerCase().replace(/\s+/g, "-");
  return VALID_NPM_NAME.test(cleaned) ? cleaned : "techradar-project";
}

export function resolveTargetDir(rawDir: string, cwd: string): ResolvedTarget {
  const trimmed = rawDir.trim();
  if (!trimmed) {
    throw new ScaffoldError(
      "No target directory provided.",
      "Run `create-techradar <directory>` (e.g. `create-techradar my-radar`).",
    );
  }
  const absolutePath = isAbsolute(trimmed) ? trimmed : resolve(cwd, trimmed);
  const projectName = deriveProjectName(basename(absolutePath));

  if (!isDirectoryUsable(absolutePath)) {
    throw new ScaffoldError(
      `Target directory ${absolutePath} already exists and is not empty.`,
      "Choose a different directory or remove the existing one first.",
    );
  }

  let created = false;
  if (!existsSync(absolutePath)) {
    mkdirSync(absolutePath, { recursive: true });
    created = true;
  }
  return { absolutePath, projectName, created };
}

export interface PackageJsonInputs {
  projectName: string;
  frameworkPackage: string;
  frameworkVersionRange: string;
}

export function buildPackageJson(
  inputs: PackageJsonInputs,
): Record<string, unknown> {
  return {
    name: inputs.projectName,
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "techradar dev",
      build: "techradar build",
      validate: "techradar validate",
    },
    dependencies: {
      [inputs.frameworkPackage]: inputs.frameworkVersionRange,
    },
    pnpm: {
      // pnpm v10+ blocks build scripts by default — both native addon installs
      // and lifecycle scripts of external deps. Approve the framework (whose
      // postinstall bootstraps `data/data.json`) plus the native-addon trio
      // Next.js requires, so `pnpm install` succeeds out of the box without
      // manual `pnpm approve-builds`.
      onlyBuiltDependencies: [
        inputs.frameworkPackage,
        "@parcel/watcher",
        "esbuild",
        "sharp",
      ],
    },
  };
}

export function writePackageJson(
  targetDir: string,
  inputs: PackageJsonInputs,
): void {
  const json = `${JSON.stringify(buildPackageJson(inputs), null, 2)}\n`;
  writeFileSync(resolve(targetDir, "package.json"), json, "utf8");
}

export function buildReadme(projectName: string): string {
  return `# ${projectName}

Bootstrapped with [\`@porscheofficial/create-techradar\`](https://www.npmjs.com/package/@porscheofficial/create-techradar).

## Scripts

- \`dev\` — run the radar locally.
- \`build\` — produce a static export.
- \`validate\` — run the framework's data validators.

Edit \`config.json\`, \`data/about.md\`, and the markdown files under \`data/radar/\` to make this radar yours.
`;
}

export function writeReadme(targetDir: string, projectName: string): void {
  writeFileSync(
    resolve(targetDir, "README.md"),
    buildReadme(projectName),
    "utf8",
  );
}

export function buildPnpmWorkspace(frameworkPackage: string): string {
  return [
    "# pnpm v10.26+ reads build-script approvals from this file.",
    "# Approves the framework's postinstall plus the native addons Next.js needs.",
    "# There are no workspace member packages — this is a standalone project.",
    "allowBuilds:",
    `  "${frameworkPackage}": true`,
    '  "@parcel/watcher": true',
    "  esbuild: true",
    "  sharp: true",
    "",
  ].join("\n");
}

export function writePnpmWorkspace(
  targetDir: string,
  frameworkPackage: string,
): void {
  writeFileSync(
    resolve(targetDir, "pnpm-workspace.yaml"),
    buildPnpmWorkspace(frameworkPackage),
    "utf8",
  );
}
