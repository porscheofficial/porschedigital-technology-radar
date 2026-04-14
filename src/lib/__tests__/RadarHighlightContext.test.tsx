import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  RadarHighlightProvider,
  useRadarHighlight,
} from "../RadarHighlightContext";

const mockRouter = vi.hoisted(() => ({
  isReady: true,
  query: {} as Record<string, string>,
  pathname: "/",
  replace: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/router", () => ({
  useRouter: vi.fn(() => mockRouter),
}));

vi.mock("@/lib/data", () => ({
  getItems: vi.fn(() => [
    {
      id: "ts",
      flag: "new",
      tags: ["lang", "frontend"],
      teams: ["platform"],
    },
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
    {
      id: "docker",
      flag: "new",
      tags: ["infra"],
      teams: ["devops"],
    },
  ]),
  getToggle: vi.fn((key: string) => {
    if (key === "multiSelectFilters") return true;
    return false;
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <RadarHighlightProvider>{children}</RadarHighlightProvider>
);

describe("RadarHighlightContext", () => {
  beforeEach(() => {
    mockRouter.query = {};
    mockRouter.replace.mockClear();
  });

  it("returns the initial state", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    expect(result.current.highlightedIds).toEqual([]);
    expect(result.current.filterActive).toBe(false);
    expect(result.current.activeFlags.size).toBe(0);
    expect(result.current.activeTags.size).toBe(0);
    expect(result.current.activeTeams.size).toBe(0);
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

  it("toggleFlag adds and removes a flag from the active set", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
    });

    expect(result.current.activeFlags.has("new")).toBe(true);

    act(() => {
      result.current.toggleFlag("new");
    });

    expect(result.current.activeFlags.has("new")).toBe(false);
    expect(result.current.activeFlags.size).toBe(0);
  });

  it("toggleTag adds and removes a tag from the active set", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTag("frontend");
    });

    expect(result.current.activeTags.has("frontend")).toBe(true);

    act(() => {
      result.current.toggleTag("frontend");
    });

    expect(result.current.activeTags.has("frontend")).toBe(false);
    expect(result.current.activeTags.size).toBe(0);
  });

  it("toggleTeam adds and removes a team from the active set", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTeam("platform");
    });

    expect(result.current.activeTeams.has("platform")).toBe(true);

    act(() => {
      result.current.toggleTeam("platform");
    });

    expect(result.current.activeTeams.has("platform")).toBe(false);
    expect(result.current.activeTeams.size).toBe(0);
  });

  it("derives highlighted ids from a single active flag", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
    });

    expect(result.current.highlightedIds).toEqual(["ts", "docker"]);
  });

  it("derives highlighted ids from a single active tag", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTag("frontend");
    });

    expect(result.current.highlightedIds).toEqual(["ts", "react"]);
  });

  it("derives highlighted ids from a single active team", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTeam("platform");
    });

    expect(result.current.highlightedIds).toEqual(["ts", "k8s"]);
  });

  it("supports multi-select within a dimension (OR semantics)", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTag("frontend");
      result.current.toggleTag("infra");
    });

    expect(result.current.activeTags.has("frontend")).toBe(true);
    expect(result.current.activeTags.has("infra")).toBe(true);
    expect(result.current.highlightedIds).toEqual([
      "ts",
      "react",
      "k8s",
      "docker",
    ]);
  });

  it("applies AND across dimensions", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
      result.current.toggleTag("infra");
    });

    expect(result.current.highlightedIds).toEqual(["docker"]);
  });

  it("supports multi-select flags with cross-dimension AND", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
      result.current.toggleFlag("changed");
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

  it("clearFilters resets all filter dimensions", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
      result.current.toggleTag("frontend");
      result.current.toggleTeam("platform");
    });

    expect(result.current.filterActive).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.activeFlags.size).toBe(0);
    expect(result.current.activeTags.size).toBe(0);
    expect(result.current.activeTeams.size).toBe(0);
    expect(result.current.highlightedIds).toEqual([]);
  });

  it("clearFilters does not affect direct highlights", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.setHighlight(["ts"], true);
      result.current.toggleTag("infra");
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.highlightedIds).toEqual(["ts"]);
    expect(result.current.filterActive).toBe(true);
  });

  it("syncs filter state to URL query params", async () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
      result.current.toggleTag("frontend");
    });

    // The state→URL effect runs asynchronously after render
    await vi.waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    });

    const lastCall =
      mockRouter.replace.mock.calls[mockRouter.replace.mock.calls.length - 1];
    const query = lastCall[0].query;
    expect(query.flags).toBe("new");
    expect(query.tags).toBe("frontend");
    expect(query.teams).toBeUndefined();
  });

  it("hydrates filter state from URL query params on mount", () => {
    mockRouter.query = { flags: "changed", teams: "platform" };

    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    // URL→state effect fires synchronously on mount with the initial query
    expect(result.current.activeFlags.has("changed")).toBe(true);
    expect(result.current.activeTeams.has("platform")).toBe(true);
    expect(result.current.activeTags.size).toBe(0);
    expect(result.current.highlightedIds).toEqual(["k8s"]);
  });

  it("removes query params when all filters are cleared", async () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
    });

    await vi.waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    });

    mockRouter.replace.mockClear();
    // Simulate that query now has the param (from the previous replace)
    mockRouter.query = { flags: "new" };

    act(() => {
      result.current.clearFilters();
    });

    await vi.waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    });

    const lastCall =
      mockRouter.replace.mock.calls[mockRouter.replace.mock.calls.length - 1];
    const query = lastCall[0].query;
    expect(query.flags).toBeUndefined();
    expect(query.tags).toBeUndefined();
    expect(query.teams).toBeUndefined();
  });
});
