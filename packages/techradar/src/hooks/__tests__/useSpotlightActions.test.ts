import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSpotlightActions } from "@/hooks/useSpotlightActions";

const pushMock = vi.fn(() => Promise.resolve(true));
const exportRadarImageMock = vi.fn(() => Promise.resolve(true));
const setActiveThemeMock = vi.fn();
const setModeMock = vi.fn();
let mockPathname = "/";
let mockThemes = [] as Array<{
  id: string;
  label: string;
  supports: Array<"light" | "dark">;
  default: "light" | "dark";
}>;
let mockTheme = {
  id: "porsche",
  label: "Porsche",
  supports: ["light", "dark"] as Array<"light" | "dark">,
  default: "dark" as const,
};
let mockMode: "light" | "dark" | "system" = "dark";

vi.mock("next/router", () => ({
  useRouter: () => ({ push: pushMock, pathname: mockPathname }),
}));

vi.mock("@/lib/utils", () => ({
  assetUrl: (p: string) => `/base${p}`,
}));

vi.mock("@/lib/exportRadarImage", () => ({
  exportRadarImage: () => exportRadarImageMock(),
}));

vi.mock("@/lib/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      id: mockTheme.id,
      label: mockTheme.label,
      supports: mockTheme.supports,
      default: mockTheme.default,
      cssVariables: {},
      radar: { segments: [], rings: [] },
      assetsResolved: {},
    },
    themes: mockThemes,
    activeTheme: mockTheme,
    mode: mockMode,
    setActiveTheme: setActiveThemeMock,
    setMode: setModeMock,
  }),
}));

describe("useSpotlightActions", () => {
  beforeEach(() => {
    pushMock.mockClear();
    exportRadarImageMock.mockClear();
    setActiveThemeMock.mockClear();
    setModeMock.mockClear();
    mockPathname = "/";
    mockTheme = {
      id: "porsche",
      label: "Porsche",
      supports: ["light", "dark"],
      default: "dark",
    };
    mockThemes = [
      mockTheme,
      {
        id: "acme",
        label: "Acme",
        supports: ["dark"],
        default: "dark",
      },
    ];
    mockMode = "dark";
  });

  it("returns base navigation actions on the start page", () => {
    const { result } = renderHook(() => useSpotlightActions(vi.fn()));
    expect(result.current.map((action) => action.id)).toEqual([
      "nav-home",
      "nav-changelog",
      "nav-about",
      "link-copy",
      "export-png",
      "theme-picker",
      "mode-picker",
    ]);
  });

  it("omits export on non-home pages", () => {
    mockPathname = "/changelog";
    const { result } = renderHook(() => useSpotlightActions(vi.fn()));
    expect(
      result.current.find((action) => action.id === "export-png"),
    ).toBeUndefined();
  });

  it("exposes sorted theme actions and selecting one sets the theme", () => {
    const onAfterPerform = vi.fn();
    const { result } = renderHook(() => useSpotlightActions(onAfterPerform));
    const picker = result.current.find(
      (action) => action.id === "theme-picker",
    );

    expect(picker?.children?.map((child) => child.id)).toEqual([
      "theme-acme",
      "theme-porsche",
    ]);

    picker?.children?.[0]?.perform();
    expect(setActiveThemeMock).toHaveBeenCalledWith("acme");
    expect(onAfterPerform).toHaveBeenCalledTimes(1);
  });

  it("exposes mode actions only when the active theme supports both modes", () => {
    const { result } = renderHook(() => useSpotlightActions(vi.fn()));
    expect(
      result.current.find((action) => action.id === "mode-picker"),
    ).toBeDefined();

    mockTheme = {
      id: "acme",
      label: "Acme",
      supports: ["dark"],
      default: "dark",
    };

    const { result: secondResult } = renderHook(() =>
      useSpotlightActions(vi.fn()),
    );
    expect(
      secondResult.current.find((action) => action.id === "mode-picker"),
    ).toBeUndefined();
  });

  it("marks the current mode and selecting a new one sets mode", () => {
    mockMode = "system";
    const onAfterPerform = vi.fn();
    const { result } = renderHook(() => useSpotlightActions(onAfterPerform));
    const picker = result.current.find((action) => action.id === "mode-picker");
    const system = picker?.children?.find(
      (child) => child.id === "mode-system",
    );
    const light = picker?.children?.find((child) => child.id === "mode-light");

    expect(system?.active).toBe(true);
    light?.perform();
    expect(setModeMock).toHaveBeenCalledWith("light");
    expect(onAfterPerform).toHaveBeenCalledTimes(1);
  });
});
