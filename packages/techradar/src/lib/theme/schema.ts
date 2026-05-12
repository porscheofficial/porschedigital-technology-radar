import { z } from "zod";

export const THEME_MODES = ["light", "dark"] as const;
export const THEME_PREFERENCE_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type ThemePreferenceMode = (typeof THEME_PREFERENCE_MODES)[number];

export const CHROME_CSS_VARIABLE_KEYS = [
  "foreground",
  "background",
  "highlight",
  "content",
  "text",
  "link",
  "border",
  "tag",
  "surface",
  "footer",
  "shading",
  "frosted",
] as const;

export type ThemeCssVariableKey = (typeof CHROME_CSS_VARIABLE_KEYS)[number];

export const CHIP_KINDS = [
  "status",
  "tag",
  "team",
  "team-added",
  "team-removed",
] as const;

export type ChipKind = (typeof CHIP_KINDS)[number];

export type ThemeModeValue<T> = T | Partial<Record<ThemeMode, T>>;

const colorValue = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$|^rgba?\(.+\)$/, {
    message: "Must be a hex color (#RRGGBB, #RRGGBBAA) or rgba/rgb value",
  });

const themeModeSchema = z.enum(THEME_MODES);

function createModeValueSchema<T extends z.ZodType>(valueSchema: T) {
  return z.union([
    valueSchema,
    z
      .object({
        light: valueSchema.optional(),
        dark: valueSchema.optional(),
      })
      .strict()
      .refine(
        (value) => value.light !== undefined || value.dark !== undefined,
        {
          message: "Mode object must define at least one value",
        },
      ),
  ]);
}

const cssVariableValueSchema = createModeValueSchema(colorValue);
const assetFileValueSchema = createModeValueSchema(z.string().min(1));
const opacityValueSchema = createModeValueSchema(z.number().min(0).max(1));
const radarPaletteSchema = z.array(cssVariableValueSchema).min(1);

const backgroundSchema = z
  .object({
    image: assetFileValueSchema,
    opacity: opacityValueSchema,
  })
  .strict();

export const ThemeJsonSchema = z
  .object({
    label: z.string().min(1),
    supports: z.array(themeModeSchema).min(1).max(2),
    default: themeModeSchema,
    cssVariables: z
      .object({
        foreground: cssVariableValueSchema,
        background: cssVariableValueSchema,
        highlight: cssVariableValueSchema,
        content: cssVariableValueSchema,
        text: cssVariableValueSchema,
        link: cssVariableValueSchema,
        border: cssVariableValueSchema,
        tag: cssVariableValueSchema,
        surface: cssVariableValueSchema,
        footer: cssVariableValueSchema,
        shading: cssVariableValueSchema,
        frosted: cssVariableValueSchema,
      })
      .strict(),
    background: backgroundSchema.optional(),
    headerLogoFile: assetFileValueSchema.optional(),
    footerLogoFile: assetFileValueSchema.optional(),
    chips: z
      .object({
        status: cssVariableValueSchema,
        tag: cssVariableValueSchema,
        team: cssVariableValueSchema,
        "team-added": cssVariableValueSchema,
        "team-removed": cssVariableValueSchema,
      })
      .strict()
      .optional(),
    radar: z
      .object({
        segments: radarPaletteSchema,
        rings: radarPaletteSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((theme, ctx) => {
    const supports = new Set(theme.supports);
    if (!supports.has(theme.default)) {
      ctx.addIssue({
        code: "custom",
        message: "default must be included in supports",
        path: ["default"],
      });
    }

    for (const key of CHROME_CSS_VARIABLE_KEYS) {
      assertModeCoverage(
        theme.cssVariables[key],
        theme.supports,
        ["cssVariables", key],
        ctx,
      );
    }

    for (const [paletteName, palette] of Object.entries(theme.radar)) {
      for (const [index, value] of palette.entries()) {
        assertModeCoverage(
          value,
          theme.supports,
          ["radar", paletteName, index],
          ctx,
        );
      }
    }

    if (theme.chips) {
      for (const kind of CHIP_KINDS) {
        assertModeCoverage(
          theme.chips[kind],
          theme.supports,
          ["chips", kind],
          ctx,
        );
      }
    }
  });

export type ThemeJson = z.infer<typeof ThemeJsonSchema>;

export type ThemeManifestAssetsResolved = {
  image?: ThemeModeValue<string>;
  headerLogo?: ThemeModeValue<string>;
  footerLogo?: ThemeModeValue<string>;
};

export type ThemeManifest = ThemeJson & {
  id: string;
  assetsResolved: ThemeManifestAssetsResolved;
};

export type ResolvedTheme = {
  id: string;
  label: string;
  supports: ThemeMode[];
  default: ThemeMode;
  cssVariables: Record<ThemeCssVariableKey, string>;
  background?: {
    image?: string;
    opacity: number;
  };
  radar: {
    segments: string[];
    rings: string[];
  };
  assetsResolved: {
    image?: string;
    headerLogo?: string;
    footerLogo?: string;
  };
};

export type Theme = ResolvedTheme;

export function isModeValueObject<T>(
  value: ThemeModeValue<T>,
): value is Partial<Record<ThemeMode, T>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSupportedMode(
  manifest: Pick<ThemeManifest, "supports">,
  mode: ThemeMode,
): boolean {
  return manifest.supports.includes(mode);
}

export function normalizeThemePreferenceMode(
  mode: ThemePreferenceMode,
  manifest: Pick<ThemeManifest, "default" | "supports">,
): ThemePreferenceMode {
  if (mode === "system" && manifest.supports.length === 2) {
    return mode;
  }
  if (manifest.supports.length === 1) {
    return manifest.supports[0];
  }
  return mode !== "system" && isSupportedMode(manifest, mode)
    ? mode
    : manifest.default;
}

export function resolveModeValue<T>(
  value: ThemeModeValue<T> | undefined,
  mode: ThemeMode,
): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isModeValueObject(value)) {
    return value;
  }
  return value[mode];
}

export function segmentColorVar(index: number): string {
  return `var(--rtk-segment-${index + 1})`;
}

export function ringColorVar(index: number): string {
  return `var(--rtk-ring-${index + 1})`;
}

export function segmentForegroundVar(index: number): string {
  return `var(--rtk-segment-${index + 1}-fg)`;
}

/**
 * Read a value from a palette by index, cycling back to the start when the
 * requested index exceeds the palette length. This lets themes ship a small,
 * curated radar palette (the built-ins ship 4 entries) while still rendering
 * correctly when a consumer's `config.json` declares a larger segments/rings
 * taxonomy. See `data/themes/.example/manifest.jsonc` for the contract.
 */
export function paletteAt<T>(palette: readonly T[], index: number): T {
  if (palette.length === 0) {
    throw new Error("paletteAt: cannot index into an empty palette");
  }
  return palette[index % palette.length];
}

export function resolveRadarHexPalette(
  manifest: ThemeManifest,
  mode: ThemeMode,
): { segments: string[]; rings: string[] } {
  return {
    segments: manifest.radar.segments.map(
      (value) => resolveModeValue(value, mode) ?? "#888888",
    ),
    rings: manifest.radar.rings.map(
      (value) => resolveModeValue(value, mode) ?? "#888888",
    ),
  };
}

export type PaletteCounts = {
  segments: number;
  rings: number;
};

export function resolveTheme(
  manifest: ThemeManifest,
  mode: ThemeMode,
  paletteCounts?: PaletteCounts,
): ResolvedTheme {
  // Array lengths must stay in lockstep with the CSS-var emission in
  // _document.tsx (which cycles via paletteAt()). See paletteAt() above.
  const segmentCount = Math.max(
    manifest.radar.segments.length,
    paletteCounts?.segments ?? 0,
  );
  const ringCount = Math.max(
    manifest.radar.rings.length,
    paletteCounts?.rings ?? 0,
  );

  return {
    id: manifest.id,
    label: manifest.label,
    supports: manifest.supports,
    default: manifest.default,
    cssVariables: Object.fromEntries(
      CHROME_CSS_VARIABLE_KEYS.map((key) => [
        key,
        resolveModeValue(manifest.cssVariables[key], mode),
      ]),
    ) as Record<ThemeCssVariableKey, string>,
    background: manifest.background
      ? {
          image: resolveModeValue(manifest.assetsResolved.image, mode),
          opacity: resolveModeValue(manifest.background.opacity, mode) ?? 0,
        }
      : undefined,
    radar: {
      segments: Array.from({ length: segmentCount }, (_, index) =>
        segmentColorVar(index),
      ),
      rings: Array.from({ length: ringCount }, (_, index) =>
        ringColorVar(index),
      ),
    },
    assetsResolved: {
      image: resolveModeValue(manifest.assetsResolved.image, mode),
      headerLogo: resolveModeValue(manifest.assetsResolved.headerLogo, mode),
      footerLogo: resolveModeValue(manifest.assetsResolved.footerLogo, mode),
    },
  };
}

function assertModeCoverage<T>(
  value: ThemeModeValue<T>,
  supports: ThemeMode[],
  path: Array<string | number>,
  ctx: z.RefinementCtx,
): void {
  if (!isModeValueObject(value)) {
    return;
  }

  for (const mode of supports) {
    if (value[mode] === undefined) {
      ctx.addIssue({
        code: "custom",
        message: `Missing ${mode} value for supported mode`,
        path,
      });
    }
  }
}
