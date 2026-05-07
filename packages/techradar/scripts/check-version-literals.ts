import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { consola } from "consola";

type ReleasePleasePackageConfig = {
  "extra-files"?: string[];
};

type ReleasePleaseConfig = {
  packages?: Record<string, ReleasePleasePackageConfig>;
};

type PackageManifest = {
  name: string;
  version: string;
};

type CanonicalPackage = PackageManifest & {
  manifestPath: string;
};

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const releasePleaseConfigPath = path.join(
  repoRoot,
  "release-please-config.json",
);
const canonicalManifestPaths = [
  path.join(repoRoot, "packages/techradar/package.json"),
  path.join(repoRoot, "packages/create-techradar/package.json"),
];
const allowlist = [
  "packages/techradar/package.json",
  "packages/create-techradar/package.json",
  "packages/techradar/.version-literal-drift-scratch.txt",
];
const VERSION_LITERAL_RE =
  /@porscheofficial\/([a-z0-9-]+)@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/g;

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function resolveExtraFile(packageDir: string, extraFile: string): string {
  const normalizedPackageDir = normalizePath(packageDir);
  const normalizedExtraFile = normalizePath(extraFile);

  if (
    normalizedExtraFile === normalizedPackageDir ||
    normalizedExtraFile.startsWith(`${normalizedPackageDir}/`)
  ) {
    return normalizedExtraFile;
  }

  return `${normalizedPackageDir}/${normalizedExtraFile}`;
}

const releasePleaseConfig = readJson<ReleasePleaseConfig>(
  releasePleaseConfigPath,
);
const canonicalPackages = canonicalManifestPaths.map(
  (manifestPath) =>
    ({
      ...readJson<PackageManifest>(manifestPath),
      manifestPath,
    }) satisfies CanonicalPackage,
);
const canonicalByName = new Map(
  canonicalPackages.map((pkg) => [pkg.name, pkg] as const),
);
const extraFiles = Object.entries(releasePleaseConfig.packages ?? {}).flatMap(
  ([packageDir, config]) =>
    (config["extra-files"] ?? []).map((extraFile) =>
      resolveExtraFile(packageDir, extraFile),
    ),
);
const scanPaths = [...new Set([...allowlist, ...extraFiles])].sort();

const drifts: string[] = [];
const missingExtraFiles: string[] = [];
let scannedFiles = 0;
let matchingLiterals = 0;

for (const relativePath of scanPaths) {
  const absolutePath = path.join(repoRoot, relativePath);
  const fileExists = existsSync(absolutePath);

  if (!fileExists) {
    if (extraFiles.includes(relativePath)) {
      missingExtraFiles.push(relativePath);
    }
    continue;
  }

  scannedFiles++;
  const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/u);

  for (const [index, line] of lines.entries()) {
    for (const match of line.matchAll(VERSION_LITERAL_RE)) {
      const packageName = `@porscheofficial/${match[1]}`;
      const literalVersion = match[2];
      const canonical = canonicalByName.get(packageName);

      if (!canonical) {
        continue;
      }

      matchingLiterals++;
      if (literalVersion !== canonical.version) {
        drifts.push(
          `DRIFT: ${relativePath}:${index + 1} contains ` +
            `${packageName}@${literalVersion} but canonical version is ` +
            `${canonical.version} from ${path.relative(repoRoot, canonical.manifestPath)}`,
        );
      }
    }
  }
}

if (missingExtraFiles.length > 0) {
  consola.error("Version-literal drift check failed — missing extra-files:");
  for (const missingFile of missingExtraFiles) {
    consola.error(`  • ${missingFile}`);
  }
  consola.info(
    "Each release-please extra-files entry must point at a real file before " +
      "the drift sensor can verify embedded package-version literals.",
  );
  process.exit(1);
}

if (drifts.length > 0) {
  consola.error(
    `Version-literal drift check failed — ${drifts.length} mismatch(es):`,
  );
  for (const drift of drifts) {
    consola.error(`  • ${drift}`);
  }
  consola.info(
    "Version-shaped literals must agree with the owning package.json version " +
      "or be removed/refactored to read the version dynamically.",
  );
  process.exit(1);
}

if (matchingLiterals === 0) {
  consola.info(
    "No allowlisted @porscheofficial/<name>@<version> literals found — " +
      "release-please extra-files is empty and the guard has nothing to verify yet.",
  );
  process.exit(0);
}

consola.success(
  `Version-literal drift OK — ${matchingLiterals} literal(s) across ` +
    `${scannedFiles} file(s) match their canonical package.json versions.`,
);
