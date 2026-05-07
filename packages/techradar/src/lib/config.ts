import defaultConfig from "../../data/config.default.json";
import _userConfig from "../../data/config.json";
import packageJson from "../../package.json";
import type { Segment } from "./types";

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

type Config = Omit<typeof defaultConfig, "segments"> & {
  segments: Segment[];
};
type UserConfig = DeepPartial<Config> & {
  quadrants?: unknown[];
  // Legacy keys — detected and rejected below
  colors?: unknown;
  backgroundImage?: unknown;
  backgroundOpacity?: unknown;
};

const userConfig = _userConfig as UserConfig;

// ADR-0028: Rename quadrant to segment.
// v7.0.0: remove this shim — see ADR-0028
// This shim MUST run at module top-level (synchronously) because consumers
// like scripts/validateFrontmatter.ts read config.segments at their own module load time.
if (userConfig.quadrants !== undefined && userConfig.segments === undefined) {
  userConfig.segments =
    userConfig.quadrants as unknown as DeepPartial<Segment>[];
  delete userConfig.quadrants;
  console.warn(
    "[techradar] 'quadrants' is deprecated and will be removed in v7.0.0. Use 'segments' instead. See ADR-0028.",
  );
} else if (
  userConfig.quadrants !== undefined &&
  userConfig.segments !== undefined
) {
  delete userConfig.quadrants;
}

// T14/T18: Legacy key detection — BREAKING change.
// These keys were removed in favour of the themes/ folder system.
const VERSION = packageJson.version;
const LEGACY_ROOT_KEYS = [
  "colors",
  "backgroundImage",
  "backgroundOpacity",
] as const;
const MIGRATION_HINT =
  "Define colors in a theme file under themes/<id>/manifest.jsonc instead. " +
  "See MIGRATION.md (Section 'v1 → v2') for the field-by-field mapping.";

for (const key of LEGACY_ROOT_KEYS) {
  if (key in userConfig) {
    throw new Error(
      `config.json: '${key}' is no longer supported in v${VERSION}. ${MIGRATION_HINT}`,
    );
  }
}
if (
  userConfig.segments?.some(
    (s) => s !== null && typeof s === "object" && "color" in s,
  )
) {
  throw new Error(
    `config.json: 'segments[].color' is no longer supported in v${VERSION}. ${MIGRATION_HINT}`,
  );
}
if (
  userConfig.rings?.some(
    (r) => r !== null && typeof r === "object" && "color" in r,
  )
) {
  throw new Error(
    `config.json: 'rings[].color' is no longer supported in v${VERSION}. ${MIGRATION_HINT}`,
  );
}

const config = { ...defaultConfig, ...userConfig } as Config;

if (
  typeof config.defaultTheme !== "string" ||
  config.defaultTheme.length === 0
) {
  throw new Error(
    "config.json: 'defaultTheme' is required and must be a non-empty string identifying a theme under themes/<id>/. " +
      "It may optionally include ':light' or ':dark' to pin the initial mode (e.g. 'acme:dark'). " +
      "See MIGRATION.md (Section 'v1 → v2', step 1) for picking a theme id.",
  );
}

if (userConfig.labels)
  config.labels = { ...defaultConfig.labels, ...userConfig.labels };

if (userConfig.toggles)
  config.toggles = { ...defaultConfig.toggles, ...userConfig.toggles };

export default config;
