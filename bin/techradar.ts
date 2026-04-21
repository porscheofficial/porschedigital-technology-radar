import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  cpSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { watch } from "chokidar";
import { defineCommand, runMain } from "citty";
import consola from "consola";
import { execa, execaSync } from "execa";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_NAME = "@porscheofficial/porschedigital-technology-radar";
const CWD = process.cwd();
const SOURCE_DIR = join(CWD, "node_modules", PACKAGE_NAME);
const BUILDER_DIR = join(CWD, ".techradar");
const HASH_FILE = join(BUILDER_DIR, "hash");
const DEBOUNCE_MS = 1000;
const GITIGNORE_ENTRIES = [".techradar/", "build/", "node_modules/"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Consumer project name for portless `--name` flag (package.json → dir basename). */
function getConsumerName(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(CWD, "package.json"), "utf-8"),
    ) as { name?: string };
    if (pkg.name) {
      return pkg.name.replace(/^@[^/]+\//, "");
    }
  } catch {
    // No package.json — fall through to basename
  }
  return basename(CWD);
}

function hasGlobalPortless(): boolean {
  try {
    execaSync("portless", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function startDevServer(mode: "sync"): void;
function startDevServer(mode: "async"): ReturnType<typeof execa>;
function startDevServer(
  mode: "sync" | "async",
): undefined | ReturnType<typeof execa> {
  const usePortless = hasGlobalPortless();
  const cmd = usePortless ? "portless" : "npx";
  const args = usePortless
    ? ["run", "--name", getConsumerName(), "next", "dev"]
    : ["next", "dev"];

  if (!usePortless) {
    consola.warn(
      "portless is not installed globally — falling back to plain next dev.\n" +
        "Install it for nicer local URLs: npm install -g portless",
    );
  }

  if (mode === "sync") {
    execaSync(cmd, args, { cwd: BUILDER_DIR, stdio: "inherit" });
  } else {
    return execa(cmd, args, { cwd: BUILDER_DIR, stdio: "inherit" });
  }
}

/** Hash of consumer package.json + lockfile (contains resolved git SHA) + installed package.json. */
function buildDirHash(): string {
  const hash = createHash("sha256");
  hash.update(readFileSync(join(CWD, "package.json")));
  const lockfile = join(CWD, "package-lock.json");
  if (existsSync(lockfile)) {
    hash.update(readFileSync(lockfile));
  }
  const sourcePkg = join(SOURCE_DIR, "package.json");
  if (existsSync(sourcePkg)) {
    hash.update(readFileSync(sourcePkg));
  }
  return hash.digest("hex");
}

function scaffold(
  target: string,
  sourcePath: string,
  label: string,
  isDir = false,
): boolean {
  if (existsSync(target)) {
    consola.info(`${label} already exists, skipping`);
    return false;
  }
  if (isDir) {
    cpSync(sourcePath, target, { recursive: true });
  } else {
    copyFileSync(sourcePath, target);
  }
  consola.success(`Created ${label}`);
  return true;
}

function isInitialized(): boolean {
  return existsSync(join(CWD, "config.json")) && existsSync(join(CWD, "radar"));
}

function ensureGitignore(): void {
  const gitignorePath = join(CWD, ".gitignore");
  const existing = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf8")
    : "";
  const lines = existing.split("\n").map((l) => l.trim());
  const missing = GITIGNORE_ENTRIES.filter((entry) => !lines.includes(entry));

  if (missing.length === 0) return;

  if (!existing) {
    writeFileSync(gitignorePath, `${missing.join("\n")}\n`);
    consola.info("Created .gitignore");
  } else {
    const prefix = existing.endsWith("\n") ? "" : "\n";
    appendFileSync(gitignorePath, `${prefix}${missing.join("\n")}\n`);
    consola.info(`Added ${missing.join(", ")} to .gitignore`);
  }
}

/**
 * Ensure .techradar/ shadow build directory is in sync with the installed
 * package. Re-creates it when the consumer's package.json or the installed
 * package changes (e.g. after npm update).
 */
function ensureBuildDir(): void {
  const currentHash = buildDirHash();
  const hashMatches =
    existsSync(BUILDER_DIR) &&
    existsSync(HASH_FILE) &&
    readFileSync(HASH_FILE, "utf8") === currentHash;

  if (hashMatches) return;

  consola.start("Preparing build environment…");

  if (existsSync(BUILDER_DIR)) {
    rmSync(BUILDER_DIR, { recursive: true });
  }

  if (!existsSync(SOURCE_DIR)) {
    consola.fatal(
      `Package "${PACKAGE_NAME}" not found at ${SOURCE_DIR}.\n` +
        `Make sure you have it in your dependencies and ran npm install.`,
    );
    process.exit(1);
  }

  cpSync(SOURCE_DIR, BUILDER_DIR, { recursive: true });

  // Strip maintainer-only lifecycle scripts from the shadow copy so the
  // consumer's `npm install` doesn't try to rebuild artifacts that are
  // already shipped pre-built in the published tarball (dist/, Icons/).
  // Transitive dependencies' postinstall scripts (e.g. esbuild) still run.
  const pkgPath = join(BUILDER_DIR, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.scripts) {
    delete pkg.scripts.prepare;
    delete pkg.scripts.postinstall;
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  writeFileSync(HASH_FILE, currentHash);

  consola.start("Installing dependencies…");
  execaSync("npm", ["install", "--no-audit", "--no-fund"], {
    cwd: BUILDER_DIR,
    stdio: "inherit",
  });
  consola.success("Build environment ready.");
}

function bootstrap(): void {
  if (!existsSync(SOURCE_DIR)) {
    consola.fatal(
      `Package "${PACKAGE_NAME}" not found at ${SOURCE_DIR}.\n` +
        "Make sure you have it in your dependencies and ran npm install.",
    );
    process.exit(1);
  }

  consola.start("Initializing Technology Radar project…");
  scaffold(
    join(CWD, "radar"),
    join(SOURCE_DIR, "data", "radar"),
    "radar/",
    true,
  );
  scaffold(join(CWD, "public"), join(SOURCE_DIR, "public"), "public/", true);
  scaffold(
    join(CWD, "config.json"),
    join(SOURCE_DIR, "data", "config.default.json"),
    "config.json",
  );
  scaffold(
    join(CWD, "about.md"),
    join(SOURCE_DIR, "data", "about.md"),
    "about.md",
  );
  scaffold(
    join(CWD, "custom.scss"),
    join(SOURCE_DIR, "src", "styles", "custom.scss"),
    "custom.scss",
  );
  scaffold(
    join(CWD, ".markdownlint-cli2.jsonc"),
    join(SOURCE_DIR, ".markdownlint-cli2.jsonc"),
    ".markdownlint-cli2.jsonc",
  );
  ensureGitignore();
  consola.success(
    "Project initialized. Edit config.json and add items to radar/.",
  );
}

function syncFilesToBuildDir(): void {
  const radarBuild = join(BUILDER_DIR, "data", "radar");
  if (existsSync(radarBuild)) {
    rmSync(radarBuild, { recursive: true });
  }
  cpSync(join(CWD, "radar"), radarBuild, { recursive: true });
  cpSync(join(CWD, "public"), join(BUILDER_DIR, "public"), { recursive: true });
  copyFileSync(join(CWD, "about.md"), join(BUILDER_DIR, "data", "about.md"));
  copyFileSync(
    join(CWD, "custom.scss"),
    join(BUILDER_DIR, "src", "styles", "custom.scss"),
  );
  copyFileSync(
    join(CWD, "config.json"),
    join(BUILDER_DIR, "data", "config.json"),
  );
}

function buildData(flags: string[] = []): void {
  const args = ["run", "build:data"];
  if (flags.length > 0) {
    args.push("--", ...flags);
  }
  execaSync("npm", args, { cwd: BUILDER_DIR, stdio: "inherit" });
}

// ---------------------------------------------------------------------------
// Sub-commands
// ---------------------------------------------------------------------------

const initCommand = defineCommand({
  meta: {
    name: "init",
    description:
      "Scaffold a new Technology Radar project in the current directory",
  },
  run() {
    bootstrap();
  },
});

const serveCommand = defineCommand({
  meta: { name: "serve", description: "Start the development server" },
  run() {
    consola.start("Starting development server…");
    startDevServer("sync");
  },
});

const buildCommand = defineCommand({
  meta: { name: "build", description: "Build the static site" },
  run() {
    consola.start("Building Technology Radar…");
    execaSync("npm", ["run", "build"], { cwd: BUILDER_DIR, stdio: "inherit" });

    const outDir = join(CWD, "build");
    if (existsSync(outDir)) {
      rmSync(outDir, { recursive: true });
    }
    renameSync(join(BUILDER_DIR, "out"), outDir);
    consola.success(`Static site written to ${outDir}`);
  },
});

const validateCommand = defineCommand({
  meta: {
    name: "validate",
    description: "Validate radar item frontmatter and markdown",
  },
  args: {
    markdown: {
      type: "boolean",
      description: "Also lint markdown with markdownlint-cli2 (if installed)",
      default: true,
    },
  },
  run({ args }) {
    consola.success("Frontmatter is valid.");

    if (!args.markdown) return;

    const radarDir = join(CWD, "radar");

    try {
      execaSync("npx", ["markdownlint-cli2", `${radarDir}/**/*.md`], {
        cwd: CWD,
        stdio: "inherit",
      });
      consola.success("Markdown lint passed.");
    } catch (error) {
      const isExecaError = (
        err: unknown,
      ): err is { exitCode: number; shortMessage: string } =>
        typeof err === "object" &&
        err !== null &&
        "exitCode" in err &&
        typeof (err as { exitCode: unknown }).exitCode === "number";

      if (isExecaError(error) && error.exitCode === 1) {
        consola.error("Markdown lint found issues (see above).");
        process.exit(1);
      }

      consola.warn(
        "markdownlint-cli2 not found — skipping markdown lint. " +
          "Install it with: npm install -D markdownlint-cli2",
      );
    }

    consola.success("All validations passed.");
  },
});

const devCommand = defineCommand({
  meta: {
    name: "dev",
    description: "Start dev server with file watching and auto-rebuild",
  },
  async run() {
    consola.start("Starting development mode…");

    const child = startDevServer("async");

    const radarDir = join(CWD, "radar");
    const aboutFile = join(CWD, "about.md");
    const customFile = join(CWD, "custom.scss");
    const configFile = join(CWD, "config.json");

    const pathMap: Record<string, { label: string; copy: () => void }> = {
      [aboutFile]: {
        label: "about.md",
        copy: () =>
          copyFileSync(aboutFile, join(BUILDER_DIR, "data", "about.md")),
      },
      [customFile]: {
        label: "custom.scss",
        copy: () =>
          copyFileSync(
            customFile,
            join(BUILDER_DIR, "src", "styles", "custom.scss"),
          ),
      },
      [configFile]: {
        label: "config.json",
        copy: () =>
          copyFileSync(configFile, join(BUILDER_DIR, "data", "config.json")),
      },
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    function debouncedRebuild(changedPath: string): void {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const mapped = pathMap[changedPath];
          if (mapped) {
            consola.info(`${mapped.label} changed`);
            mapped.copy();
          } else if (changedPath.startsWith(radarDir)) {
            const relative = changedPath.replace(radarDir, "");
            consola.info(`${relative} changed, rebuilding data…`);
            const radarBuild = join(BUILDER_DIR, "data", "radar");
            if (existsSync(radarBuild)) {
              rmSync(radarBuild, { recursive: true });
            }
            cpSync(radarDir, radarBuild, { recursive: true });
          } else {
            consola.info("File changed");
          }
          buildData();
        } catch (err) {
          consola.error("Unable to rebuild data. Please restart the server.");
          consola.error(err);
        }
      }, DEBOUNCE_MS);
    }

    const watcher = watch([radarDir, aboutFile, customFile, configFile], {
      persistent: true,
      ignoreInitial: true,
      depth: 5,
      ignored: (path: string) => path.startsWith("."),
    });

    watcher
      .on("add", debouncedRebuild)
      .on("change", debouncedRebuild)
      .on("unlink", debouncedRebuild);

    await child;
  },
});

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

const main = defineCommand({
  meta: {
    name: "techradar",
    version: "1.0.0",
    description: "Porsche Technology Radar CLI",
  },
  args: {
    strict: {
      type: "boolean",
      description: "Exit on data validation errors",
      default: false,
    },
  },
  subCommands: {
    init: initCommand,
    validate: validateCommand,
    serve: serveCommand,
    build: buildCommand,
    dev: devCommand,
  },
  setup({ args, rawArgs }) {
    // Skip setup for init — it handles its own bootstrapping
    if (rawArgs.includes("init")) return;

    if (!isInitialized()) {
      consola.fatal("Project not initialized. Run `npx techradar init` first.");
      process.exit(1);
    }

    ensureBuildDir();
    syncFilesToBuildDir();
    consola.start("Building data…");
    const strict = args.strict || rawArgs.includes("validate");
    buildData(strict ? ["--strict"] : []);
  },
});

runMain(main);
