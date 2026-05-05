import fs from "node:fs";
import path from "node:path";
import {
  resolveModeValue,
  type ThemeManifest,
  type ThemeManifestAssetsResolved,
  type ThemeModeValue,
} from "@/lib/theme/schema";

export interface AssetOptions {
  themes: ThemeManifest[];
  publicDir: string; // absolute path to packages/techradar/public/
  sourceRootByThemeId: Record<string, string>; // themeId → absolute path to that theme's data folder
}

function copyThemeAsset(
  relativeSource: string,
  themeId: string,
  sourceRoot: string,
  publicDir: string,
): string {
  const srcPath = path.join(sourceRoot, relativeSource);
  const basename = path.basename(relativeSource);
  const destDir = path.join(publicDir, "themes", themeId);
  const destPath = path.join(destDir, basename);

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(srcPath, destPath);

  return `/themes/${themeId}/${basename}`;
}

export function materializeThemeAssets(opts: AssetOptions): ThemeManifest[] {
  const { themes, publicDir, sourceRootByThemeId } = opts;

  return themes.map((theme) => {
    const sourceRoot = sourceRootByThemeId[theme.id];
    const assetsResolved: ThemeManifestAssetsResolved = {};

    materializeModeValueAssets({
      sourceRoot,
      themeId: theme.id,
      publicDir,
      value: theme.background?.image,
      setResolved: (resolved) => {
        assetsResolved.image = resolved;
      },
    });

    materializeModeValueAssets({
      sourceRoot,
      themeId: theme.id,
      publicDir,
      value: theme.headerLogoFile,
      setResolved: (resolved) => {
        assetsResolved.headerLogo = resolved;
      },
    });

    materializeModeValueAssets({
      sourceRoot,
      themeId: theme.id,
      publicDir,
      value: theme.footerLogoFile,
      setResolved: (resolved) => {
        assetsResolved.footerLogo = resolved;
      },
    });

    return { ...theme, assetsResolved };
  });
}

function materializeModeValueAssets(args: {
  sourceRoot: string | undefined;
  themeId: string;
  publicDir: string;
  value: ThemeModeValue<string> | undefined;
  setResolved: (value: ThemeModeValue<string> | undefined) => void;
}): void {
  const { sourceRoot, themeId, publicDir, value, setResolved } = args;

  if (!sourceRoot || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    setResolved(copyThemeAsset(value, themeId, sourceRoot, publicDir));
    return;
  }

  const resolved = {
    light: resolveModeValue(value, "light"),
    dark: resolveModeValue(value, "dark"),
  } satisfies Partial<Record<"light" | "dark", string>>;

  const copied: Partial<Record<"light" | "dark", string>> = {};

  for (const mode of ["light", "dark"] as const) {
    if (resolved[mode]) {
      copied[mode] = copyThemeAsset(
        resolved[mode],
        themeId,
        sourceRoot,
        publicDir,
      );
    }
  }

  if (copied.light || copied.dark) {
    setResolved(copied);
  }
}
