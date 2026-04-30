import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSpotlightActions } from "@/hooks/useSpotlightActions";

const pushMock = vi.fn(() => Promise.resolve(true));

vi.mock("next/router", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/utils", () => ({
  assetUrl: (p: string) => `/base${p}`,
}));

describe("useSpotlightActions", () => {
  beforeEach(() => {
    pushMock.mockClear();
    pushMock.mockImplementation(() => Promise.resolve(true));
  });

  it("returns the action set with stable ids", () => {
    const onAfterPerform = vi.fn();
    const { result } = renderHook(() => useSpotlightActions(onAfterPerform));
    expect(result.current.map((a) => a.id)).toEqual([
      "nav-home",
      "nav-changelog",
      "nav-about",
      "link-copy",
    ]);
  });

  it("each nav action pushes through the router and prefixes basePath", () => {
    const onAfterPerform = vi.fn();
    const { result } = renderHook(() => useSpotlightActions(onAfterPerform));
    result.current.find((a) => a.id === "nav-home")?.perform();
    expect(pushMock).toHaveBeenCalledWith("/base/");
    result.current.find((a) => a.id === "nav-changelog")?.perform();
    expect(pushMock).toHaveBeenCalledWith("/base/changelog");
    result.current.find((a) => a.id === "nav-about")?.perform();
    expect(pushMock).toHaveBeenCalledWith("/base/help-and-about-tech-radar");
    expect(onAfterPerform).toHaveBeenCalledTimes(3);
  });

  it("link-copy writes location.href to the clipboard", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const onAfterPerform = vi.fn();
    const { result } = renderHook(() => useSpotlightActions(onAfterPerform));
    result.current.find((a) => a.id === "link-copy")?.perform();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(onAfterPerform).toHaveBeenCalledTimes(1);
  });
});
