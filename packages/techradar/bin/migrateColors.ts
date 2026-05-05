import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import consola from "consola";
import { z } from "zod";
import { type ThemeJson, ThemeJsonSchema } from "../src/lib/theme/schema";

const PORSCHE_DARK_THEME_PATH = resolve(
  __dirname,
  "../data/themes/porsche-dark/manifest.jsonc",
);

const legacyColorsSchema = z.object({
  foreground: z.string(),
  background: z.string(),
  highlight: z.string(),
  content: z.string(),
  text: z.string(),
  link: z.string(),
  border: z.string(),
  tag: z.string(),
});

const legacyConfigSchema = z
  .object({
    colors: legacyColorsSchema.optional(),
    backgroundImage: z.string().optional(),
    backgroundOpacity: z.number().optional(),
    defaultTheme: z.string().optional(),
    segments: z.array(z.object({ color: z.string().optional() }).passthrough()),
    rings: z.array(z.object({ color: z.string().optional() }).passthrough()),
  })
  .passthrough();

type LegacyConfig = z.infer<typeof legacyConfigSchema>;

export type MigrateColorsOptions = {
  cwd?: string;
  config?: string;
  outputId?: string;
  dryRun?: boolean;
};

export type MigrateColorsResult =
  | {
      status: "noop";
      configPath: string;
      dryRun: boolean;
    }
  | {
      status: "migrated";
      configPath: string;
      themePath: string;
      copiedImagePath?: string;
      dryRun: boolean;
      theme: ThemeJson;
      migratedConfig: LegacyConfig;
      themeJsonText: string;
      configJsonText: string;
    };

type PorscheDarkThemeDefaults = Pick<
  ThemeJson["cssVariables"],
  "surface" | "footer" | "shading" | "frosted"
>;

function readPorscheDarkDefaults(): PorscheDarkThemeDefaults {
  const theme = ThemeJsonSchema.parse(
    JSON.parse(readFileSync(PORSCHE_DARK_THEME_PATH, "utf8")),
  );

  return {
    surface: theme.cssVariables.surface,
    footer: theme.cssVariables.footer,
    shading: theme.cssVariables.shading,
    frosted: theme.cssVariables.frosted,
  };
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function hasLegacyKeys(config: LegacyConfig): boolean {
  return (
    config.colors !== undefined ||
    config.backgroundImage !== undefined ||
    config.backgroundOpacity !== undefined ||
    config.segments.some((segment) => segment.color !== undefined) ||
    config.rings.some((ring) => ring.color !== undefined)
  );
}

function ensureInsideConfigDir(configDir: string, targetPath: string): void {
  const relativePath = relative(configDir, targetPath);
  const isInside =
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath));

  if (!isInside) {
    throw new Error(
      `Resolved path escapes the config directory: ${targetPath}`,
    );
  }
}

function isRemoteAsset(pathOrUrl: string): boolean {
  return /^https?:\/\//.test(pathOrUrl);
}

function resolveLocalBackgroundSource(
  configDir: string,
  backgroundImage: string,
): string {
  const relativeAssetPath = backgroundImage.replace(/^[\\/]+/, "");
  const sourcePath = resolve(configDir, relativeAssetPath);
  ensureInsideConfigDir(configDir, sourcePath);
  return sourcePath;
}

function buildTheme(config: LegacyConfig): ThemeJson {
  const legacyColors = legacyColorsSchema.parse(config.colors);
  const porscheDarkDefaults = readPorscheDarkDefaults();
  const backgroundImage = config.backgroundImage;

  return ThemeJsonSchema.parse({
    label: "Custom (migrated)",
    colorScheme: "dark",
    cssVariables: {
      ...legacyColors,
      surface: porscheDarkDefaults.surface,
      footer: porscheDarkDefaults.footer,
      shading: porscheDarkDefaults.shading,
      frosted: porscheDarkDefaults.frosted,
    },
    background: backgroundImage
      ? {
          image: basename(backgroundImage),
          opacity: config.backgroundOpacity ?? 0,
        }
      : undefined,
    radar: {
      segments: config.segments.map((segment) => segment.color).filter(Boolean),
      rings: config.rings.map((ring) => ring.color).filter(Boolean),
    },
  });
}

function buildMigratedConfig(
  config: LegacyConfig,
  outputId: string,
): LegacyConfig {
  const { colors, backgroundImage, backgroundOpacity, ...rest } = config;

  return {
    ...rest,
    defaultTheme: outputId,
    segments: config.segments.map(({ color, ...segment }) => segment),
    rings: config.rings.map(({ color, ...ring }) => ring),
  };
}

function resolveCopiedImagePath(
  theme: ReturnType<typeof buildTheme>,
  config: LegacyConfig,
  themeDir: string,
  configDir: string,
): string | undefined {
  const imageValue = theme.background?.image;
  if (
    !config.backgroundImage ||
    imageValue === undefined ||
    typeof imageValue !== "string"
  ) {
    return undefined;
  }
  const copiedImagePath = resolve(themeDir, imageValue);
  ensureInsideConfigDir(configDir, copiedImagePath);
  return copiedImagePath;
}

function logDryRun(args: {
  themePath: string;
  themeJsonText: string;
  configPath: string;
  configJsonText: string;
  backgroundImage: string | undefined;
  copiedImagePath: string | undefined;
}): void {
  consola.info(`Dry run: would write ${args.themePath}`);
  consola.info(args.themeJsonText.trimEnd());
  consola.info(`Dry run: would update ${args.configPath}`);
  consola.info(args.configJsonText.trimEnd());
  if (args.backgroundImage && isRemoteAsset(args.backgroundImage)) {
    consola.warn(
      `Background image is remote (${args.backgroundImage}); only the basename will be preserved in manifest.jsonc.`,
    );
  } else if (args.copiedImagePath) {
    consola.info(
      `Dry run: would copy background image to ${args.copiedImagePath}`,
    );
  }
}

function copyBackgroundImage(
  backgroundImage: string | undefined,
  copiedImagePath: string | undefined,
  configDir: string,
): void {
  if (!backgroundImage || !copiedImagePath) {
    return;
  }
  if (isRemoteAsset(backgroundImage)) {
    consola.warn(
      `Background image is remote (${backgroundImage}); only the basename was preserved in manifest.jsonc.`,
    );
    return;
  }
  const sourcePath = resolveLocalBackgroundSource(configDir, backgroundImage);
  if (!existsSync(sourcePath)) {
    throw new Error(`Background image not found: ${sourcePath}`);
  }
  copyFileSync(sourcePath, copiedImagePath);
}

export function migrateColors(
  options: MigrateColorsOptions = {},
): MigrateColorsResult {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolve(cwd, options.config ?? "./config.json");
  const outputId = options.outputId ?? "custom";
  const dryRun = options.dryRun ?? false;
  const configDir = dirname(configPath);
  const themeDir = resolve(configDir, "data", "themes", outputId);
  const themePath = resolve(themeDir, "manifest.jsonc");

  ensureInsideConfigDir(configDir, themeDir);
  ensureInsideConfigDir(configDir, themePath);

  const config = legacyConfigSchema.parse(
    JSON.parse(readFileSync(configPath, "utf8")),
  );

  if (!hasLegacyKeys(config)) {
    consola.success("Nothing to migrate");
    return {
      status: "noop",
      configPath,
      dryRun,
    };
  }

  const theme = buildTheme(config);
  const migratedConfig = buildMigratedConfig(config, outputId);
  const themeJsonText = serializeJson(theme);
  const configJsonText = serializeJson(migratedConfig);

  consola.info(
    'Generated theme uses colorScheme="dark" as a heuristic. Edit manifest.jsonc if you prefer light.',
  );

  const copiedImagePath = resolveCopiedImagePath(
    theme,
    config,
    themeDir,
    configDir,
  );

  if (dryRun) {
    logDryRun({
      themePath,
      themeJsonText,
      configPath,
      configJsonText,
      backgroundImage: config.backgroundImage,
      copiedImagePath,
    });

    return {
      status: "migrated",
      configPath,
      themePath,
      copiedImagePath,
      dryRun,
      theme,
      migratedConfig,
      themeJsonText,
      configJsonText,
    };
  }

  mkdirSync(themeDir, { recursive: true });
  writeFileSync(themePath, themeJsonText);
  copyBackgroundImage(config.backgroundImage, copiedImagePath, configDir);
  writeFileSync(configPath, configJsonText);

  consola.success(`Migrated config: ${configPath}`);
  consola.success(`Generated theme: ${themePath}`);
  if (copiedImagePath && !isRemoteAsset(config.backgroundImage ?? "")) {
    consola.success(`Copied background image: ${copiedImagePath}`);
  }
  consola.success(`Set defaultTheme to "${outputId}"`);

  return {
    status: "migrated",
    configPath,
    themePath,
    copiedImagePath,
    dryRun,
    theme,
    migratedConfig,
    themeJsonText,
    configJsonText,
  };
}
