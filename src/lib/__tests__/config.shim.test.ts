import fs from "node:fs";
import path from "node:path";
import consola from "consola";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dataJsonPath = path.resolve(__dirname, "../../../data/data.json");

const { mockedUserConfig } = vi.hoisted(() => ({
  mockedUserConfig: {
    default: {},
  },
}));

vi.mock("../../../data/config.json", () => mockedUserConfig);

describe("config back-compat shim", () => {
  async function importConfigPipeline() {
    const { default: config } = await import("@/lib/config");
    const { getSegments } = await import("@/lib/data");

    return { config, getSegments };
  }

  function writeMinimalRadarData() {
    fs.writeFileSync(
      dataJsonPath,
      JSON.stringify({ releases: [], tags: [], items: [] }),
      "utf8",
    );
  }

  beforeEach(() => {
    vi.resetModules();
    writeMinimalRadarData();
    mockedUserConfig.default = {};
    vi.spyOn(consola, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(dataJsonPath, { force: true });
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("existing forks with quadrants config key continue working through getSegments", async () => {
    mockedUserConfig.default = {
      quadrants: [
        {
          id: "legacy-platforms",
          title: "Legacy Platforms",
          color: "#000000",
          description: "Imported from a fork still using quadrants.",
        },
        {
          id: "legacy-tools",
          title: "Legacy Tools",
          color: "#111111",
          description: "Second legacy segment.",
        },
      ],
    };

    const { config, getSegments } = await importConfigPipeline();

    expect(config.segments).toEqual([
      {
        id: "legacy-platforms",
        title: "Legacy Platforms",
        color: "#000000",
        description: "Imported from a fork still using quadrants.",
      },
      {
        id: "legacy-tools",
        title: "Legacy Tools",
        color: "#111111",
        description: "Second legacy segment.",
      },
    ]);
    expect(getSegments()).toEqual([
      {
        id: "legacy-platforms",
        title: "Legacy Platforms",
        color: "#000000",
        description: "Imported from a fork still using quadrants.",
        position: 1,
      },
      {
        id: "legacy-tools",
        title: "Legacy Tools",
        color: "#111111",
        description: "Second legacy segment.",
        position: 2,
      },
    ]);
    expect((config as Record<string, unknown>).quadrants).toBeUndefined();
    expect(consola.warn).toHaveBeenCalledTimes(1);
    expect(consola.warn).toHaveBeenCalledWith(
      '[deprecated] config key "quadrants" is renamed to "segments". Please update your config.json.',
    );
  });

  it("modern forks already using segments config key do not get a deprecation warning", async () => {
    mockedUserConfig.default = {
      segments: [
        {
          id: "modern-platforms",
          title: "Modern Platforms",
          color: "#111111",
          description: "Already migrated.",
        },
      ],
    };

    const { config } = await importConfigPipeline();

    expect(config.segments).toEqual([
      {
        id: "modern-platforms",
        title: "Modern Platforms",
        color: "#111111",
        description: "Already migrated.",
      },
    ]);
    expect(consola.warn).not.toHaveBeenCalled();
  });

  it("segments config key wins without warning when both legacy and migrated keys are present", async () => {
    mockedUserConfig.default = {
      quadrants: [
        {
          id: "old-platforms",
          title: "Old Platforms",
          color: "#000000",
          description: "Legacy value that must not clobber segments.",
        },
      ],
      segments: [
        {
          id: "new-platforms",
          title: "New Platforms",
          color: "#111111",
          description: "Migrated value that must win.",
        },
      ],
    };

    const { config, getSegments } = await importConfigPipeline();

    expect(config.segments).toEqual([
      {
        id: "new-platforms",
        title: "New Platforms",
        color: "#111111",
        description: "Migrated value that must win.",
      },
    ]);
    expect(getSegments()).toEqual([
      {
        id: "new-platforms",
        title: "New Platforms",
        color: "#111111",
        description: "Migrated value that must win.",
        position: 1,
      },
    ]);
    expect(consola.warn).not.toHaveBeenCalled();
  });
});
