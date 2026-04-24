import consola from "consola";
import defaultConfigRaw from "../../data/config.default.json";
import _userConfig from "../../data/config.json";
import type { Segment } from "./types";

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

// Map default config from quadrants -> segments since data/config.default.json
// isn't updated in this wave.
const { quadrants: defaultQuadrants, ...restDefault } = defaultConfigRaw;
const defaultConfig = {
  ...restDefault,
  segments: defaultQuadrants as unknown as Segment[],
};

export type Config = typeof defaultConfig;
type UserConfig = DeepPartial<Config> & { quadrants?: unknown[] };

const userConfig = _userConfig as UserConfig;

// ADR-0025: Rename quadrant to segment.
// This shim MUST run at module top-level (synchronously) because consumers
// like scripts/validateFrontmatter.ts read config.segments at their own module load time.
if (userConfig.quadrants !== undefined && userConfig.segments === undefined) {
  userConfig.segments =
    userConfig.quadrants as unknown as DeepPartial<Segment>[];
  delete userConfig.quadrants;
  consola.warn(
    '[deprecated] config key "quadrants" is renamed to "segments". Please update your config.json.',
  );
} else if (
  userConfig.quadrants !== undefined &&
  userConfig.segments !== undefined
) {
  delete userConfig.quadrants;
}

const config = { ...defaultConfig, ...userConfig } as Config;

if (userConfig.colors)
  config.colors = { ...defaultConfig.colors, ...userConfig.colors };

if (userConfig.labels)
  config.labels = { ...defaultConfig.labels, ...userConfig.labels };

if (userConfig.toggles)
  config.toggles = { ...defaultConfig.toggles, ...userConfig.toggles };

export default config;
