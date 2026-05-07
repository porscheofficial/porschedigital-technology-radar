import consola from "consola";

import { ScaffoldError } from "./errors.ts";
import { detectPackageManager, type PackageManager } from "./packageManager.ts";
import { fetchLatestVersion } from "./registry.ts";
import { runGitInit, runInstall, runTechradarInit } from "./runners.ts";
import {
  resolveTargetDir,
  writePackageJson,
  writePnpmWorkspace,
  writeReadme,
} from "./scaffold.ts";

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
    consola.start(`Scaffolding into ${target.absolutePath}`);

    const pm =
      options.packageManager ??
      detectPackageManager(process.env.npm_config_user_agent);
    consola.info(`Using package manager: ${pm}`);

    consola.start(
      `Looking up the latest ${FRAMEWORK_PACKAGE} on the npm registry`,
    );
    const latest = await fetchLatestVersion(FRAMEWORK_PACKAGE, {
      registry: options.registry,
    });
    const versionRange = `^${latest}`;
    consola.success(
      `Resolved ${FRAMEWORK_PACKAGE}@${latest} (pinning ${versionRange})`,
    );

    consola.start("Writing package.json, pnpm-workspace.yaml and README.md");
    writePackageJson(target.absolutePath, {
      projectName: target.projectName,
      frameworkPackage: FRAMEWORK_PACKAGE,
      frameworkVersionRange: versionRange,
    });
    writePnpmWorkspace(target.absolutePath);
    writeReadme(target.absolutePath, target.projectName);

    consola.start(`Installing dependencies with ${pm}`);
    runInstall(pm, target.absolutePath);

    consola.start(
      "Running `techradar init` to materialise the starter content",
    );
    runTechradarInit(pm, target.absolutePath);

    consola.start("Initialising git repository");
    const git = runGitInit(target.absolutePath);
    if (git.ran && !git.reason) consola.success("Created initial commit.");
    else if (git.reason) consola.warn(`Skipped git init: ${git.reason}.`);

    consola.box(
      `Done. Next steps:\n\n  cd ${options.targetDir}\n  ${pm} run dev`,
    );
    return 0;
  } catch (err) {
    if (err instanceof ScaffoldError) {
      consola.error(err.message);
      consola.info(`Fix: ${err.fix}`);
      if (debug && err.cause instanceof Error)
        consola.debug(err.cause.stack ?? err.cause.message);
      return 1;
    }
    const message = err instanceof Error ? err.message : String(err);
    consola.error(message);
    if (debug && err instanceof Error) consola.debug(err.stack ?? err.message);
    return 1;
  }
}
