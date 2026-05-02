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
  getToggle: vi.fn(() => false),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <RadarHighlightProvider>{children}</RadarHighlightProvider>
);

describe("RadarHighlightContext (single-select mode)", () => {
  beforeEach(() => {
    mockRouter.query = {};
    mockRouter.replace.mockClear();
  });

  it("replaces the active flag instead of accumulating", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
    });

    expect(result.current.activeFlags.has("new")).toBe(true);
    expect(result.current.activeFlags.size).toBe(1);

    act(() => {
      result.current.toggleFlag("changed");
    });

    expect(result.current.activeFlags.has("changed")).toBe(true);
    expect(result.current.activeFlags.has("new")).toBe(false);
    expect(result.current.activeFlags.size).toBe(1);
  });

  it("deselects the active flag when toggled again", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
    });

    act(() => {
      result.current.toggleFlag("new");
    });

    expect(result.current.activeFlags.size).toBe(0);
  });

  it("replaces the active tag instead of accumulating", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTag("frontend");
    });

    expect(result.current.activeTags.has("frontend")).toBe(true);

    act(() => {
      result.current.toggleTag("infra");
    });

    expect(result.current.activeTags.has("infra")).toBe(true);
    expect(result.current.activeTags.has("frontend")).toBe(false);
    expect(result.current.activeTags.size).toBe(1);
  });

  it("replaces the active team instead of accumulating", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleTeam("platform");
    });

    expect(result.current.activeTeams.has("platform")).toBe(true);

    act(() => {
      result.current.toggleTeam("frontend");
    });

    expect(result.current.activeTeams.has("frontend")).toBe(true);
    expect(result.current.activeTeams.has("platform")).toBe(false);
    expect(result.current.activeTeams.size).toBe(1);
  });

  it("derives correct highlights with single-select across dimensions", () => {
    const { result } = renderHook(() => useRadarHighlight(), { wrapper });

    act(() => {
      result.current.toggleFlag("new");
      result.current.toggleTag("infra");
    });

    expect(result.current.activeFlags.size).toBe(1);
    expect(result.current.activeTags.size).toBe(1);
    expect(result.current.highlightedIds).toEqual(["docker"]);
  });
});
