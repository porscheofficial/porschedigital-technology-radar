import { ScaffoldError } from "./errors.ts";
import { logger } from "./logger.ts";
import { detectPackageManager, type PackageManager } from "./packageManager.ts";
import { fetchLatestVersion } from "./registry.ts";
import { runGitInit, runInstall, runTechradarInit } from "./runners.ts";
import { resolveTargetDir, writePackageJson, writeReadme } from "./scaffold.ts";

export const FRAMEWORK_PACKAGE =
  "@porscheofficial/porschedigital-technology-radar";

export interface CreateTechradarOptions {
  targetDir: string;
  cwd?: string;
  packageManager?: PackageManager;
  registry?: string;
  debug?: boolean;
}

export async function runCreateTechradar(
  options: CreateTechradarOptions,
): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const debug = options.debug ?? process.env.DEBUG === "1";

  try {
    const target = resolveTargetDir(options.targetDir, cwd);
    logger.step(`Scaffolding into ${target.absolutePath}`);

    const pm =
      options.packageManager ??
      detectPackageManager(process.env.npm_config_user_agent);
    logger.info(`Using package manager: ${pm}`);

    logger.step(
      `Looking up the latest ${FRAMEWORK_PACKAGE} on the npm registry`,
    );
    const latest = await fetchLatestVersion(FRAMEWORK_PACKAGE, {
      registry: options.registry,
    });
    const versionRange = `^${latest}`;
    logger.success(
      `Resolved ${FRAMEWORK_PACKAGE}@${latest} (pinning ${versionRange})`,
    );

    logger.step("Writing package.json and README.md");
    writePackageJson(target.absolutePath, {
      projectName: target.projectName,
      frameworkPackage: FRAMEWORK_PACKAGE,
      frameworkVersionRange: versionRange,
    });
    writeReadme(target.absolutePath, target.projectName);

    logger.step(`Installing dependencies with ${pm}`);
    runInstall(pm, target.absolutePath);

    logger.step("Running `techradar init` to materialise the starter content");
    runTechradarInit(pm, target.absolutePath);

    logger.step("Initialising git repository");
    const git = runGitInit(target.absolutePath);
    if (git.ran && !git.reason) logger.success("Created initial commit.");
    else if (git.reason) logger.warn(`Skipped git init: ${git.reason}.`);

    logger.info("");
    logger.success(`Done. Next steps:`);
    logger.info(`  cd ${options.targetDir}`);
    logger.info(`  ${pm} run dev`);
    return 0;
  } catch (err) {
    if (err instanceof ScaffoldError) {
      logger.error(err.message);
      logger.hint(err.fix);
      if (debug && err.cause instanceof Error)
        logger.hint(err.cause.stack ?? err.cause.message);
      return 1;
    }
    logger.error((err as Error).message ?? String(err));
    if (debug && err instanceof Error) logger.hint(err.stack ?? err.message);
    return 1;
  }
}
