import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockedUserConfig } = vi.hoisted(() => ({
  mockedUserConfig: {
    default: {},
  },
}));

vi.mock("../../../data/config.json", () => mockedUserConfig);

vi.mock("../../../data/data.json", () => ({
  default: { releases: [], tags: [], items: [] },
}));

describe("config back-compat shim", () => {
  async function importConfigPipeline() {
    const { default: config } = await import("@/lib/config");
    const { getSegments } = await import("@/lib/data");

    return { config, getSegments };
  }

  beforeEach(() => {
    vi.resetModules();
    mockedUserConfig.default = {};
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("existing consumer projects with quadrants config key continue working through getSegments", async () => {
    mockedUserConfig.default = {
      quadrants: [
        {
          id: "legacy-platforms",
          title: "Legacy Platforms",
          description:
            "Imported from a consumer project still using quadrants.",
        },
        {
          id: "legacy-tools",
          title: "Legacy Tools",
          description: "Second legacy segment.",
        },
      ],
    };

    const { config, getSegments } = await importConfigPipeline();

    expect(config.segments).toEqual([
      {
        id: "legacy-platforms",
        title: "Legacy Platforms",
        description: "Imported from a consumer project still using quadrants.",
      },
      {
        id: "legacy-tools",
        title: "Legacy Tools",
        description: "Second legacy segment.",
      },
    ]);
    expect(getSegments()).toEqual([
      {
        id: "legacy-platforms",
        title: "Legacy Platforms",
        description: "Imported from a consumer project still using quadrants.",
        position: 1,
      },
      {
        id: "legacy-tools",
        title: "Legacy Tools",
        description: "Second legacy segment.",
        position: 2,
      },
    ]);
    expect((config as Record<string, unknown>).quadrants).toBeUndefined();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      "[techradar] 'quadrants' is deprecated and will be removed in v7.0.0. Use 'segments' instead. See ADR-0028.",
    );
  });

  it("modern consumer projects already using segments config key do not get a deprecation warning", async () => {
    mockedUserConfig.default = {
      segments: [
        {
          id: "modern-platforms",
          title: "Modern Platforms",
          description: "Already migrated.",
        },
      ],
    };

    const { config } = await importConfigPipeline();

    expect(config.segments).toEqual([
      {
        id: "modern-platforms",
        title: "Modern Platforms",
        description: "Already migrated.",
      },
    ]);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("segments config key wins without warning when both legacy and migrated keys are present", async () => {
    mockedUserConfig.default = {
      quadrants: [
        {
          id: "old-platforms",
          title: "Old Platforms",
          description: "Legacy value that must not clobber segments.",
        },
      ],
      segments: [
        {
          id: "new-platforms",
          title: "New Platforms",
          description: "Migrated value that must win.",
        },
      ],
    };

    const { config, getSegments } = await importConfigPipeline();

    expect(config.segments).toEqual([
      {
        id: "new-platforms",
        title: "New Platforms",
        description: "Migrated value that must win.",
      },
    ]);
    expect(getSegments()).toEqual([
      {
        id: "new-platforms",
        title: "New Platforms",
        description: "Migrated value that must win.",
        position: 1,
      },
    ]);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
