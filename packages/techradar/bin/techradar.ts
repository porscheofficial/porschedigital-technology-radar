import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { watch } from "chokidar";
import { defineCommand, runMain } from "citty";
import consola from "consola";
import { execa, execaSync } from "execa";
import {
  buildConfigJson,
  collectAnswers,
  generateStarterBlips,
  type InitAnswers,
  loadInitContext,
} from "./initFlow";
import { applyMechanicalRenames } from "./migrateApply";
import { detectAll, type Finding } from "./migrateDetect";
import { extractThemeFromConfig, type ThemeMode } from "./migrateThemes";
import { sanitizeShadowTsconfig } from "./sanitizeShadowTsconfig";

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
  // Read-or-empty without a separate existsSync gate to avoid TOCTOU
  // (CodeQL js/file-system-race). ENOENT is the only expected failure mode.
  let existing = "";
  try {
    existing = readFileSync(gitignorePath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  const lines = existing.split("\n").map((l) => l.trim());
  const missing = GITIGNORE_ENTRIES.filter((entry) => !lines.includes(entry));

  if (missing.length === 0) return;

  // appendFileSync creates the file when absent, so a single call covers
  // both the create and append paths without a second filesystem check.
  const prefix = !existing || existing.endsWith("\n") ? "" : "\n";
  appendFileSync(gitignorePath, `${prefix}${missing.join("\n")}\n`);
  consola.info(
    existing
      ? `Added ${missing.join(", ")} to .gitignore`
      : "Created .gitignore",
  );
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

  // Skip copying nested `node_modules/`: when consumer peer-dep conflicts
  // force npm to hoist `next`/`react`/etc. *inside* the installed package,
  // copying them across has two failure modes that together produce the
  // dual-React `useContext` null prerender crash documented in ADR-0024:
  //
  //   1. `cpSync` with `recursive: true` rewrites relative symlinks to
  //      absolute paths (Node default `verbatimSymlinks: false`). The source
  //      `.bin/next -> ../next/dist/bin/next` becomes a hard absolute path
  //      pointing back into the consumer's nested copy.
  //   2. `npm install` will not regenerate a bin link if one already exists,
  //      so `.techradar/node_modules/.bin/next` keeps pointing OUTSIDE
  //      `.techradar/`.
  //
  // Result: `npm run build` inside `.techradar/` resolves `next` to the
  // outside copy, which loads its own React at a different absolute path.
  // Even when versions match, CommonJS module identity is path-based, so two
  // React instances exist and `ReactSharedInternals` is null in workers.
  //
  // Letting `npm install` populate `node_modules/` from scratch guarantees
  // every binary, dependency, and bin-link lives strictly inside `.techradar/`.
  cpSync(SOURCE_DIR, BUILDER_DIR, {
    recursive: true,
    filter: (src) => !src.includes(`${PACKAGE_NAME}/node_modules`),
  });

  // Strip maintainer-only lifecycle scripts and QA-only devDependencies from
  // the shadow copy. Per ADR-0021 every build-time runtime dep lives in
  // `dependencies`, so deleting `devDependencies` outright leaves the shadow
  // install with exactly the set the build needs and avoids npm resolving
  // QA-only peer-dep conflicts (e.g. eslint-plugin-jsx-a11y vs eslint@10).
  // Transitive dependencies' postinstall scripts (e.g. esbuild) still run.
  const pkgPath = join(BUILDER_DIR, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.scripts) {
    delete pkg.scripts.prepare;
    delete pkg.scripts.postinstall;
  }
  delete pkg.devDependencies;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  // Mirror the runtime split (build-time deps in `dependencies`, QA tools in
  // `devDependencies`) at the type-check layer: exclude QA-only scripts and
  // tests whose imports won't resolve once devDependencies are gone. See ADR-0021.
  // Read+write atomically via try/catch instead of existsSync+read+write to
  // avoid a TOCTOU race (CodeQL js/file-system-race) on the shared shadow dir.
  const tsconfigPath = join(BUILDER_DIR, "tsconfig.json");
  let tsconfigRaw: string | undefined;
  try {
    tsconfigRaw = readFileSync(tsconfigPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  if (tsconfigRaw !== undefined) {
    const tsconfig = JSON.parse(tsconfigRaw);
    writeFileSync(
      tsconfigPath,
      `${JSON.stringify(sanitizeShadowTsconfig(tsconfig), null, 2)}\n`,
    );
  }

  writeFileSync(HASH_FILE, currentHash);

  consola.start("Installing dependencies…");
  execaSync("npm", ["install", "--no-audit", "--no-fund"], {
    cwd: BUILDER_DIR,
    stdio: "inherit",
  });
  consola.success("Build environment ready.");
}

function writeFileIfMissing(
  target: string,
  content: string,
  label: string,
): boolean {
  mkdirSync(dirname(target), { recursive: true });
  try {
    writeFileSync(target, content, { flag: "wx" });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      consola.info(`${label} already exists, skipping`);
      return false;
    }
    throw err;
  }
  consola.success(`Created ${label}`);
  return true;
}

function scaffoldCustomTheme(
  slug: string,
  label: string,
  themesSourceDir: string,
): void {
  const target = join(CWD, "themes", slug);
  if (existsSync(target)) {
    consola.info(`themes/${slug}/ already exists, skipping custom theme`);
    return;
  }
  const exampleDir = join(themesSourceDir, ".example");
  if (!existsSync(exampleDir)) {
    consola.warn(
      `.example theme not found at ${exampleDir} — cannot scaffold custom theme.`,
    );
    return;
  }
  cpSync(exampleDir, target, { recursive: true });
  const manifestPath = join(target, "manifest.jsonc");
  try {
    const raw = readFileSync(manifestPath, "utf8");
    const escapedLabel = JSON.stringify(label).slice(1, -1);
    const patched = raw.replace(
      /"label":\s*"[^"]*"/,
      `"label": "${escapedLabel}"`,
    );
    writeFileSync(manifestPath, patched);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  consola.success(`Created themes/${slug}/ (from .example/)`);
}

async function bootstrap(
  opts: { yes: boolean } = { yes: false },
): Promise<void> {
  if (!existsSync(SOURCE_DIR)) {
    consola.fatal(
      `Package "${PACKAGE_NAME}" not found at ${SOURCE_DIR}.\n` +
        "Make sure you have it in your dependencies and ran npm install.",
    );
    process.exit(1);
  }

  const interactive = !opts.yes && process.stdin.isTTY === true;
  const ctx = loadInitContext({
    cwd: CWD,
    sourceDir: SOURCE_DIR,
    interactive,
  });
  const answers: InitAnswers = await collectAnswers(ctx, basename(CWD));

  consola.start("Initializing Technology Radar project…");

  // Static assets that always come straight from the package (idempotent).
  scaffold(join(CWD, "public"), join(SOURCE_DIR, "public"), "public/", true);
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

  writeFileIfMissing(
    join(CWD, "config.json"),
    `${JSON.stringify(buildConfigJson(answers), null, 2)}\n`,
    "config.json",
  );

  // The literal `scaffold(join(CWD, "themes", theme)` shape below is asserted
  // by init-theme-copy.test.ts as a guard against the historical bug where
  // themes were misrouted into <consumer>/data/themes/.
  const themesSourceDir = join(SOURCE_DIR, "data", "themes");
  if (existsSync(themesSourceDir)) {
    for (const theme of answers.themes) {
      scaffold(
        join(CWD, "themes", theme),
        join(themesSourceDir, theme),
        `themes/${theme}/`,
        true,
      );
    }
    if (answers.customTheme) {
      scaffoldCustomTheme(
        answers.customTheme.slug,
        answers.customTheme.label,
        themesSourceDir,
      );
    }
  }

  const radarDirTarget = join(CWD, "radar");
  if (
    answers.taxonomy === "standard" &&
    answers.examples &&
    !existsSync(radarDirTarget)
  ) {
    scaffold(radarDirTarget, join(SOURCE_DIR, "data", "radar"), "radar/", true);
  } else {
    mkdirSync(radarDirTarget, { recursive: true });
    for (const file of generateStarterBlips(answers)) {
      writeFileIfMissing(
        join(radarDirTarget, file.path),
        file.content,
        `radar/${file.path}`,
      );
    }
  }

  ensureGitignore();
  consola.success(
    "Project initialized. Edit config.json and add items to radar/.\n" +
      "  Configuration reference: https://github.com/porscheofficial/porschedigital-technology-radar/tree/main/packages/techradar#%EF%B8%8F-configuration",
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
  syncThemesToBuildDir();
}

// Consumer themes live at `<consumer>/themes/<id>/` (top-level, like `radar/`)
// and must be copied into `.techradar/data/themes/<id>/` because the shadow
// build expects the package layout. Without this sync the consumer's edits
// have zero effect — the shadow keeps the built-in themes from `cpSync(SOURCE)`
// in `ensureBuildDir()`. We replace the entire `data/themes` directory rather
// than overlay so deleting a consumer theme actually removes it from the build.
function syncThemesToBuildDir(): void {
  const consumerThemes = join(CWD, "themes");
  if (!existsSync(consumerThemes)) return;
  const themesBuild = join(BUILDER_DIR, "data", "themes");
  if (existsSync(themesBuild)) {
    rmSync(themesBuild, { recursive: true });
  }
  cpSync(consumerThemes, themesBuild, { recursive: true });
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
  args: {
    yes: {
      type: "boolean",
      description:
        "Skip interactive prompts and accept all defaults (use in CI / scaffolders).",
      default: false,
    },
  },
  async run({ args }) {
    await bootstrap({ yes: args.yes === true });
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
    const themesDir = join(CWD, "themes");
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
          } else if (changedPath.startsWith(themesDir)) {
            const relative = changedPath.replace(themesDir, "");
            consola.info(`themes${relative} changed, syncing themes…`);
            syncThemesToBuildDir();
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

    const watcher = watch(
      [radarDir, themesDir, aboutFile, customFile, configFile],
      {
        persistent: true,
        ignoreInitial: true,
        depth: 5,
        ignored: (path: string) => path.startsWith("."),
      },
    );

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

function formatFinding(f: Finding): string {
  const icon = f.severity === "error" ? "✖" : "⚠";
  return `  ${icon} ${f.key}\n      ${f.message}\n      → ${f.fix}`;
}

function printFindings(findings: Finding[]): void {
  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");
  if (errors.length > 0) {
    consola.error(`${errors.length} blocking issue(s) (v2 build will fail):`);
    for (const f of errors) consola.log(formatFinding(f));
  }
  if (warns.length > 0) {
    consola.warn(
      `${warns.length} deprecation(s) (v2 still accepts these via shims):`,
    );
    for (const f of warns) consola.log(formatFinding(f));
  }
}

function runMigrateApply(report: ReturnType<typeof detectAll>): void {
  consola.start("Applying mechanical rewrites…");
  const result = applyMechanicalRenames({ cwd: CWD });

  if (result.changes.length === 0) {
    consola.info(
      "No mechanical rewrites available. Remaining findings need manual edits — see MIGRATION.md.",
    );
    printFindings(report.findings);
    if (report.hasErrors) process.exit(1);
    return;
  }

  for (const c of result.changes) {
    consola.log(`  • ${c.file} — ${c.description}`);
  }
  if (result.backupDir) {
    consola.info(
      `Backup written to ${result.backupDir}/. Add that path to .gitignore or commit it. Restore by copying files back into place.`,
    );
  }
  for (const e of result.errors) {
    consola.error(`Failed to write ${e.file}: ${e.message}`);
  }

  consola.start("Re-scanning for remaining v1 markers…");
  const after = detectAll(CWD);
  if (!after.hasV1Markers) {
    consola.success("All v1 markers resolved. Run `npx techradar build`.");
    if (result.errors.length > 0) process.exit(1);
    return;
  }

  consola.warn(
    `${after.findings.length} finding(s) remain (theme & manual steps).`,
  );
  printFindings(after.findings);
  consola.info(
    `See MIGRATION.md (Section "v1 → v2", step 3) for the theme extraction recipe.`,
  );
  if (after.hasErrors || result.errors.length > 0) process.exit(1);
}

interface ExtractThemeArgs {
  "theme-id"?: string;
  "theme-label"?: string;
  "theme-supports"?: string;
  "theme-default"?: string;
}

function parseSupports(input: string): ThemeMode[] {
  const tokens = input
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const valid: ThemeMode[] = [];
  for (const t of tokens) {
    if (t === "light" || t === "dark") {
      if (!valid.includes(t)) valid.push(t);
    }
  }
  return valid;
}

async function resolveExtractThemeInputs(args: ExtractThemeArgs): Promise<{
  themeId: string;
  label: string;
  supports: ThemeMode[];
  defaultMode: ThemeMode;
} | null> {
  const themeId =
    args["theme-id"] ??
    (await consola.prompt("Theme id (URL-safe slug, e.g. 'acme'):", {
      type: "text",
      placeholder: "acme",
    }));
  if (typeof themeId !== "string" || themeId.trim() === "") {
    consola.fatal("theme-id is required.");
    return null;
  }

  const label =
    args["theme-label"] ??
    (await consola.prompt("Human-readable theme label:", {
      type: "text",
      default: themeId,
    }));
  if (typeof label !== "string" || label.trim() === "") {
    consola.fatal("theme-label is required.");
    return null;
  }

  let supports: ThemeMode[];
  if (args["theme-supports"]) {
    supports = parseSupports(args["theme-supports"]);
  } else {
    const picked = await consola.prompt(
      "Which color modes does this theme support?",
      {
        type: "select",
        options: [
          { label: "light + dark", value: "light,dark" },
          { label: "light only", value: "light" },
          { label: "dark only", value: "dark" },
        ],
      },
    );
    supports = parseSupports(String(picked));
  }
  if (supports.length === 0) {
    consola.fatal(
      "theme-supports must include at least one of 'light' or 'dark'.",
    );
    return null;
  }

  let defaultMode: ThemeMode;
  if (args["theme-default"]) {
    const v = args["theme-default"].trim().toLowerCase();
    if (v !== "light" && v !== "dark") {
      consola.fatal("theme-default must be 'light' or 'dark'.");
      return null;
    }
    defaultMode = v;
  } else if (supports.length === 1) {
    defaultMode = supports[0];
  } else {
    const picked = await consola.prompt(
      "Default mode (when no user preference):",
      {
        type: "select",
        options: supports.map((m) => ({ label: m, value: m })),
      },
    );
    defaultMode = String(picked) === "dark" ? "dark" : "light";
  }
  if (!supports.includes(defaultMode)) {
    consola.fatal(
      `theme-default '${defaultMode}' must be one of the supported modes [${supports.join(", ")}].`,
    );
    return null;
  }

  return {
    themeId: themeId.trim(),
    label: label.trim(),
    supports,
    defaultMode,
  };
}

async function runMigrateExtractTheme(args: ExtractThemeArgs): Promise<void> {
  const inputs = await resolveExtractThemeInputs(args);
  if (!inputs) {
    process.exit(1);
    return;
  }

  consola.start(
    `Extracting v1 theming into themes/${inputs.themeId}/manifest.jsonc…`,
  );
  const result = extractThemeFromConfig({ cwd: CWD, ...inputs });

  for (const c of result.changes) {
    consola.log(`  • ${c.file} — ${c.description}`);
  }
  if (result.backupDir) {
    consola.info(
      `Backup written to ${result.backupDir}/. Add that path to .gitignore or commit it. Restore by copying files back into place.`,
    );
  }
  for (const e of result.errors) {
    consola.error(`Failed: ${e.file}: ${e.message}`);
  }
  if (result.unmappedColors.length > 0) {
    consola.warn(
      `Skipped v1 'colors' keys with no v2 equivalent: ${result.unmappedColors.join(", ")}. Add them under cssVariables in the new manifest if you want to keep them.`,
    );
  }
  if (inputs.supports.length === 2) {
    consola.info(
      "Dual-mode theme: every color value was duplicated into {light, dark}. Tune the dark-mode values in the new manifest to match your brand.",
    );
  }

  consola.start("Re-scanning for remaining v1 markers…");
  const after = detectAll(CWD);
  if (!after.hasV1Markers) {
    consola.success(
      `Theme extracted. Run \`npx techradar build\` to verify, then commit themes/${inputs.themeId}/.`,
    );
    if (result.errors.length > 0) process.exit(1);
    return;
  }
  consola.warn(`${after.findings.length} finding(s) remain.`);
  printFindings(after.findings);
  if (after.hasErrors || result.errors.length > 0) process.exit(1);
}

const migrateCommand = defineCommand({
  meta: {
    name: "migrate",
    description: "Detect (and optionally apply) v1 → v2 configuration upgrades",
  },
  args: {
    apply: {
      type: "boolean",
      description:
        "Apply the safe mechanical rewrites (quadrants→segments, frontmatter rename). A backup is written under .techradar-migrate-backup/<timestamp>/.",
      default: false,
    },
    "extract-theme": {
      type: "boolean",
      description:
        "Lift v1 inline theming (colors, backgroundImage, segments[].color, rings[].color) into a new themes/<id>/manifest.jsonc and stamp defaultTheme into config.json. Prompts interactively for theme id / label / modes if not supplied via flags. A backup is written under .techradar-migrate-backup/<timestamp>/.",
      default: false,
    },
    "theme-id": {
      type: "string",
      description: "Theme id (URL-safe slug) for --extract-theme.",
    },
    "theme-label": {
      type: "string",
      description: "Human-readable theme label for --extract-theme.",
    },
    "theme-supports": {
      type: "string",
      description:
        "Modes the theme supports for --extract-theme: 'light', 'dark', or 'light,dark'.",
    },
    "theme-default": {
      type: "string",
      description:
        "Default mode for --extract-theme (must be one of theme-supports).",
    },
  },
  async run({ args }) {
    const report = detectAll(CWD);

    if (!report.hasV1Markers) {
      consola.success(
        "No v1 markers detected. Project looks like a clean v2 setup.",
      );
      return;
    }

    if (args["extract-theme"]) {
      await runMigrateExtractTheme(args);
      return;
    }

    if (!args.apply) {
      printFindings(report.findings);
      consola.info(
        `See MIGRATION.md for the full v1 → v2 recipe. Re-run with \`--apply\` to perform the safe mechanical rewrites${
          report.hasErrors
            ? ", then `--extract-theme` to lift v1 colors into a theme manifest"
            : ""
        }.${report.hasErrors ? " Exiting non-zero for CI." : ""}`,
      );
      if (report.hasErrors) process.exit(1);
      return;
    }

    runMigrateApply(report);
  },
});

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
    migrate: migrateCommand,
  },
  setup({ args, rawArgs }) {
    // init bootstraps itself; migrate is read-only and must skip ensureBuildDir (npm install).
    if (rawArgs.includes("init") || rawArgs.includes("migrate")) return;

    if (!isInitialized()) {
      consola.fatal("Project not initialized. Run `npx techradar init` first.");
      process.exit(1);
    }

    const report = detectAll(CWD);
    if (report.hasErrors) {
      const errCount = report.findings.filter(
        (f) => f.severity === "error",
      ).length;
      consola.warn(
        `Detected v1 configuration (${errCount} blocking issue(s)). ` +
          `Run \`npx techradar migrate\` for a guided upgrade. See MIGRATION.md.`,
      );
    }

    ensureBuildDir();
    syncFilesToBuildDir();
    consola.start("Building data…");
    const strict = args.strict || rawArgs.includes("validate");
    buildData(strict ? ["--strict"] : []);
  },
});

runMain(main);
