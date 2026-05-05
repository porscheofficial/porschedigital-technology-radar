import { act, renderHook } from "@testing-library/react";
import type { MouseEvent, RefObject } from "react";

import { useRadarTooltip } from "../useRadarTooltip";

const { mockHighlight, mockUseRadarHighlight } = vi.hoisted(() => ({
  mockHighlight: {
    highlightedIds: [] as string[],
    filterActive: false,
    setHighlight: vi.fn(),
    activeFlags: new Set<string>(),
    activeTags: new Set<string>(),
    activeTeams: new Set<string>(),
    toggleFlag: vi.fn(),
    toggleTag: vi.fn(),
    toggleTeam: vi.fn(),
    clearFilters: vi.fn(),
  },
  mockUseRadarHighlight: vi.fn(),
}));

vi.mock("@/lib/RadarHighlightContext", () => ({
  useRadarHighlight: mockUseRadarHighlight,
}));

function createRect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function createContainerRef() {
  const container = document.createElement("div");

  Object.defineProperty(container, "getBoundingClientRect", {
    value: () => createRect(10, 20, 200, 200),
  });

  document.body.appendChild(container);

  const containerRef: RefObject<HTMLDivElement | null> = { current: container };

  return { container, containerRef };
}

function createTooltipLink(container: HTMLDivElement) {
  const link = document.createElement("a");
  link.setAttribute("data-tooltip", "TypeScript");
  link.setAttribute("data-tooltip-color", "#ff0000");
  link.setAttribute("data-tooltip-fg", "#FFFFFF");
  link.setAttribute("data-item-id", "ts");
  link.setAttribute("href", "/items/ts");

  Object.defineProperty(link, "getBoundingClientRect", {
    value: () => createRect(30, 60, 20, 12),
  });

  container.appendChild(link);

  return link;
}

describe("useRadarTooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockHighlight.highlightedIds = [];
    mockHighlight.filterActive = false;
    mockUseRadarHighlight.mockReturnValue(mockHighlight);

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) =>
        setTimeout(() => callback(performance.now()), 0),
      ),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((id: ReturnType<typeof setTimeout>) => clearTimeout(id)),
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("returns the initial tooltip state", () => {
    const { containerRef } = createContainerRef();
    const { result } = renderHook(() => useRadarTooltip(containerRef));

    expect(result.current.tooltip).toEqual({
      show: false,
      text: "",
      color: "",
      colorFg: "",
      x: 0,
      y: 0,
    });
  });

  it("returns an empty tooltipMap initially", () => {
    const { containerRef } = createContainerRef();
    const { result } = renderHook(() => useRadarTooltip(containerRef));

    expect(result.current.tooltipMap.size).toBe(0);
  });

  it("returns an empty shownIds set initially", () => {
    const { containerRef } = createContainerRef();
    const { result } = renderHook(() => useRadarTooltip(containerRef));

    expect(result.current.shownIds.size).toBe(0);
  });

  it("handleMouseLeave resets tooltip show to false", () => {
    const { container, containerRef } = createContainerRef();
    const link = createTooltipLink(container);
    const { result } = renderHook(() => useRadarTooltip(containerRef));

    act(() => {
      result.current.handleMouseMove({
        target: link,
      } as unknown as MouseEvent<HTMLDivElement>);
      vi.runAllTimers();
    });

    expect(result.current.tooltip.show).toBe(true);

    act(() => {
      result.current.handleMouseLeave();
    });

    expect(result.current.tooltip.show).toBe(false);
  });

  it("returns stable handler references across rerenders", () => {
    const { containerRef } = createContainerRef();
    const { result, rerender } = renderHook(() =>
      useRadarTooltip(containerRef),
    );
    const firstMouseMove = result.current.handleMouseMove;
    const firstMouseLeave = result.current.handleMouseLeave;

    rerender();

    expect(result.current.handleMouseMove).toBe(firstMouseMove);
    expect(result.current.handleMouseLeave).toBe(firstMouseLeave);
  });

  it("computes tooltipStyle from the tooltip state", () => {
    const { container, containerRef } = createContainerRef();
    const link = createTooltipLink(container);
    const { result } = renderHook(() => useRadarTooltip(containerRef));

    act(() => {
      result.current.handleMouseMove({
        target: link,
      } as unknown as MouseEvent<HTMLDivElement>);
      vi.runAllTimers();
    });

    expect(result.current.tooltipStyle).toMatchObject({
      left: 30,
      top: 40,
      "--tooltip": "#ff0000",
    });
  });
});
