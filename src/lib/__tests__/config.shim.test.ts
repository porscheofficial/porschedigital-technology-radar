import consola from "consola";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("config back-compat shim", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(consola, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Test A: aliases quadrants to segments and warns when segments is missing", async () => {
    vi.doMock("../../../data/config.json", () => ({
      default: {
        quadrants: [{ id: "a", name: "A", color: "#000", description: "" }],
      },
    }));

    const { default: config } = await import("@/lib/config");

    expect(config.segments).toBeDefined();
    expect(config.segments).toEqual([
      { id: "a", name: "A", color: "#000", description: "" },
    ]);
    expect((config as Record<string, unknown>).quadrants).toBeUndefined();
    expect(consola.warn).toHaveBeenCalledWith(
      '[deprecated] config key "quadrants" is renamed to "segments". Please update your config.json.',
    );
  });

  it("Test B: no warning when only segments is present", async () => {
    vi.doMock("../../../data/config.json", () => ({
      default: {
        segments: [{ id: "b", name: "B", color: "#111", description: "" }],
      },
    }));

    const { default: config } = await import("@/lib/config");

    expect(config.segments).toBeDefined();
    expect(config.segments).toEqual([
      { id: "b", name: "B", color: "#111", description: "" },
    ]);
    expect(consola.warn).not.toHaveBeenCalled();
  });

  it("Test C: precedence - segments wins and no warning when both present", async () => {
    vi.doMock("../../../data/config.json", () => ({
      default: {
        quadrants: [{ id: "old", name: "OLD", color: "#000", description: "" }],
        segments: [{ id: "new", name: "NEW", color: "#111", description: "" }],
      },
    }));

    const { default: config } = await import("@/lib/config");

    expect(config.segments).toBeDefined();
    expect(config.segments).toEqual([
      { id: "new", name: "NEW", color: "#111", description: "" },
    ]);
    expect(consola.warn).not.toHaveBeenCalled();
  });
});
