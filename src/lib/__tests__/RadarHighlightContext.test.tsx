import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  RadarHighlightProvider,
  useRadarHighlight,
} from "../RadarHighlightContext";

vi.mock("@/lib/data", () => ({
  getItems: vi.fn(() => [
    { id: "ts", flag: "new", tags: ["lang"], teams: ["platform"] },
    {
      id: "react",
      flag: "default",
      tags: ["frontend"],
      teams: ["frontend"],
    },
    {
      id: "k8s",
      flag: "changed",
      tags: ["infra"],
      teams: ["platform"],
    },
  ]),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <RadarHighlightProvider>{children}</RadarHighlightProvider>
);

describe("RadarHighlightContext", () => {
  it("returns the initial state", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    expect(result.current.highlightedIds).toEqual([]);
    expect(result.current.filterActive).toBe(false);
    expect(result.current.activeFlag).toBeNull();
    expect(result.current.activeTag).toBeNull();
    expect(result.current.activeTeam).toBeNull();
  });

  it("setHighlight sets direct highlights", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.setHighlight(["ts", "react"], true);
    });

    expect(result.current.highlightedIds).toEqual(["ts", "react"]);
    expect(result.current.filterActive).toBe(true);
  });

  it("setHighlight with empty ids clears highlight", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.setHighlight(["ts"], true);
    });

    act(() => {
      result.current.setHighlight([], false);
    });

    expect(result.current.highlightedIds).toEqual([]);
    expect(result.current.filterActive).toBe(false);
  });

  it("toggleFlag toggles the active flag on and off", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
    });

    expect(result.current.activeFlag).toBe("new");

    act(() => {
      result.current.toggleFlag("new");
    });

    expect(result.current.activeFlag).toBeNull();
  });

  it("toggleTag toggles the active tag on and off", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTag("frontend");
    });

    expect(result.current.activeTag).toBe("frontend");

    act(() => {
      result.current.toggleTag("frontend");
    });

    expect(result.current.activeTag).toBeNull();
  });

  it("toggleTeam toggles the active team on and off", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTeam("platform");
    });

    expect(result.current.activeTeam).toBe("platform");

    act(() => {
      result.current.toggleTeam("platform");
    });

    expect(result.current.activeTeam).toBeNull();
  });

  it("derives highlighted ids from the active flag filter", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
    });

    expect(result.current.highlightedIds).toEqual(["ts"]);
  });

  it("derives highlighted ids from the active tag filter", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTag("frontend");
    });

    expect(result.current.highlightedIds).toEqual(["react"]);
  });

  it("derives highlighted ids from the active team filter", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTeam("platform");
    });

    expect(result.current.highlightedIds).toEqual(["ts", "k8s"]);
  });

  it("intersects direct highlights with filter matches", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.setHighlight(["ts", "react"], true);
      result.current.toggleTeam("platform");
    });

    expect(result.current.highlightedIds).toEqual(["ts"]);
  });

  it("marks filterActive true when a direct highlight or filter is active", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.setHighlight(["react"], true);
    });

    expect(result.current.filterActive).toBe(true);

    act(() => {
      result.current.setHighlight([], false);
      result.current.toggleTag("frontend");
    });

    expect(result.current.filterActive).toBe(true);
  });
});
