import { fireEvent, render } from "@testing-library/react";

import { Chart } from "@/components/Radar/Chart";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { Flag, type Item, type Ring, type Segment } from "@/lib/types";

const setHighlightPreview = vi.fn();

vi.mock("@/lib/data", () => ({
  getToggle: vi.fn(() => false),
  getItemChangeDirection: vi.fn(() => undefined),
  getChartConfig: vi.fn(() => ({ size: 800, blipSize: 12 })),
}));

vi.mock("@/lib/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    activeTheme: {
      id: "porsche",
      label: "Porsche",
      supports: ["dark"],
      default: "dark" as const,
    },
    mode: "dark" as const,
    theme: {
      id: "porsche",
      label: "Porsche",
      supports: ["dark"],
      default: "dark" as const,
      cssVariables: {},
      radar: {
        segments: ["#4A9E7E", "#5B8DB8", "#C4A85E", "#B85B5B"],
        rings: ["#00aa88", "#0088aa", "#aa8800", "#888888"],
      },
      assetsResolved: {},
    },
    themes: [],
    setActiveTheme: vi.fn(),
    setMode: vi.fn(),
  })),
}));

vi.mock("@/lib/RadarHighlightContext", () => ({
  useRadarHighlight: vi.fn(() => ({
    highlightedIds: [],
    filterMatchIds: new Set<string>(),
    filterActive: false,
    setHighlightPreview,
  })),
}));

const segments: Segment[] = [
  {
    id: "platforms",
    title: "Platforms",
    description: "",
    position: 1,
  },
  {
    id: "tools",
    title: "Tools",
    description: "",
    position: 2,
  },
  {
    id: "languages",
    title: "Languages",
    description: "",
    position: 3,
  },
  {
    id: "techniques",
    title: "Techniques",
    description: "",
    position: 4,
  },
];

const rings: Ring[] = [
  {
    id: "adopt",
    title: "Adopt",
    description: "",
    radius: 0.4,
    strokeWidth: 2,
  },
  {
    id: "trial",
    title: "Trial",
    description: "",
    radius: 0.7,
    strokeWidth: 2,
  },
  {
    id: "assess",
    title: "Assess",
    description: "",
    radius: 0.9,
    strokeWidth: 2,
  },
  {
    id: "hold",
    title: "Hold",
    description: "",
    radius: 1.0,
    strokeWidth: 2,
  },
];

const items: Item[] = [
  {
    id: "react",
    title: "React",
    body: "",
    featured: false,
    release: "2024-01",
    segment: "tools",
    ring: "adopt",
    flag: Flag.Default,
    position: [100, 100],
    revisions: [],
  },
  {
    id: "vue",
    title: "Vue",
    body: "",
    featured: false,
    release: "2024-01",
    segment: "tools",
    ring: "adopt",
    flag: Flag.Default,
    position: [120, 120],
    revisions: [],
  },
  {
    id: "rust",
    title: "Rust",
    body: "",
    featured: false,
    release: "2024-01",
    segment: "languages",
    ring: "trial",
    flag: Flag.Default,
    position: [200, 200],
    revisions: [],
  },
];

describe("Chart wedges", () => {
  beforeEach(() => {
    setHighlightPreview.mockClear();
  });

  it("renders one wedge per (segment, ring) pair", () => {
    const { container } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const wedges = container.querySelectorAll('a[href*="#ring-"]');
    expect(wedges).toHaveLength(segments.length * rings.length);
  });

  it("wedge href targets /{segment}#ring-{ring}", () => {
    const { container } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const wedge = container.querySelector('a[href$="/tools#ring-adopt"]');
    expect(wedge).not.toBeNull();
  });

  it("wedge aria-label includes segment title, ring title, and item count", () => {
    const { container } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const wedge = container.querySelector('a[href$="/tools#ring-adopt"]');
    expect(wedge).not.toBeNull();
    expect(wedge?.getAttribute("aria-label")).toBe("Tools, Adopt (2 items)");

    const empty = container.querySelector('a[href$="/platforms#ring-adopt"]');
    expect(empty?.getAttribute("aria-label")).toBe(
      "Platforms, Adopt (0 items)",
    );

    const single = container.querySelector('a[href$="/languages#ring-trial"]');
    expect(single?.getAttribute("aria-label")).toBe(
      "Languages, Trial (1 item)",
    );
  });

  it("hovering a wedge calls setHighlightPreview with the matching item ids", () => {
    const { container } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const wedge = container.querySelector('a[href$="/tools#ring-adopt"]');
    expect(wedge).not.toBeNull();
    if (!wedge) return;

    fireEvent.mouseEnter(wedge);
    expect(setHighlightPreview).toHaveBeenLastCalledWith(["react", "vue"]);

    fireEvent.mouseLeave(wedge);
    expect(setHighlightPreview).toHaveBeenLastCalledWith([]);
  });

  it("clicking a wedge commits via setHighlightPreview (preview semantics suppress tooltips)", () => {
    const { container } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const wedge = container.querySelector('a[href$="/tools#ring-adopt"]');
    expect(wedge).not.toBeNull();
    if (!wedge) return;

    fireEvent.pointerDown(wedge);
    expect(setHighlightPreview).toHaveBeenLastCalledWith(["react", "vue"]);
  });

  it("mouseLeave after click does NOT clear the highlight (committed lock)", () => {
    const { container } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const wedge = container.querySelector('a[href$="/tools#ring-adopt"]');
    expect(wedge).not.toBeNull();
    if (!wedge) return;

    fireEvent.mouseEnter(wedge);
    fireEvent.pointerDown(wedge);
    setHighlightPreview.mockClear();

    fireEvent.mouseLeave(wedge);
    fireEvent.blur(wedge);
    expect(setHighlightPreview).not.toHaveBeenCalled();
  });

  it("wedge contains an SVG path with non-empty d attribute", () => {
    const { container } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const wedge = container.querySelector('a[href$="/tools#ring-adopt"]');
    const path = wedge?.querySelector("path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("d")?.length ?? 0).toBeGreaterThan(0);
  });

  it("freezes highlight to wedge ∩ filter on commit, even when hover preview has not propagated to context", () => {
    // Regression: a click without a settled hover (touch tap, fast click,
    // keyboard "Enter") fires before React commits the SET_DIRECT_PREVIEW
    // dispatched on mouseEnter. At that instant `highlightedIds` still
    // returns the full filter set, so a snapshot built from `highlightedIds`
    // would freeze every filter-matched blip — flashing the un-narrowed set
    // during the soft-navigation handoff. The fix derives the snapshot from
    // the wedge's own ids ∩ filterMatchIds, independent of context state.
    const mockUseRadarHighlight = vi.mocked(useRadarHighlight);
    // Filter is active. The wedge "tools/adopt" contains "react" and "vue".
    // The filter matches react, vue, and rust. Pre-click the hover preview
    // has NOT propagated, so highlightedIds = full filter set.
    mockUseRadarHighlight.mockReturnValue({
      highlightedIds: ["react", "vue", "rust"],
      filterMatchIds: new Set(["react", "vue", "rust"]),
      filterActive: true,
      hasFilter: true,
      suppressTooltips: false,
      activeFlags: new Set(),
      activeTags: new Set(),
      activeTeams: new Set(),
      setHighlight: vi.fn(),
      setHighlightPreview,
      toggleFlag: vi.fn(),
      toggleTag: vi.fn(),
      toggleTeam: vi.fn(),
      clearFilters: vi.fn(),
    });

    const { container, rerender } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const wedge = container.querySelector('a[href$="/tools#ring-adopt"]');
    expect(wedge).not.toBeNull();
    if (!wedge) return;

    fireEvent.pointerDown(wedge);

    // Even if every prior filter-matched id remains highlighted in context,
    // the frozen snapshot must restrict to wedge.ids = {react, vue}.
    // "rust" is in the filter but not in the clicked wedge — it must NOT
    // be highlighted post-commit.
    mockUseRadarHighlight.mockReturnValue({
      highlightedIds: ["react", "vue", "rust"],
      filterMatchIds: new Set(["react", "vue", "rust"]),
      filterActive: true,
      hasFilter: true,
      suppressTooltips: false,
      activeFlags: new Set(),
      activeTags: new Set(),
      activeTeams: new Set(),
      setHighlight: vi.fn(),
      setHighlightPreview,
      toggleFlag: vi.fn(),
      toggleTag: vi.fn(),
      toggleTeam: vi.fn(),
      clearFilters: vi.fn(),
    });
    rerender(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );

    const reactBlipAfter = container.querySelector('a[data-item-id="react"]');
    const vueBlipAfter = container.querySelector('a[data-item-id="vue"]');
    const rustBlipAfter = container.querySelector('a[data-item-id="rust"]');
    expect(reactBlipAfter?.getAttribute("class") ?? "").toMatch(/highlighted/);
    expect(vueBlipAfter?.getAttribute("class") ?? "").toMatch(/highlighted/);
    expect(rustBlipAfter?.getAttribute("class") ?? "").toMatch(/dimmed/);
  });

  it("freezes to empty (no labels, no dim) on commit when no filter is active", () => {
    // Regression: without a filter, the pre-hover baseline shows no labels
    // and no dimming. A wedge commit must preserve that baseline through
    // navigation; freezing to wedgeIds would flash labels for every blip in
    // the wedge and dim the rest until the segment page mounts.
    const mockUseRadarHighlight = vi.mocked(useRadarHighlight);
    mockUseRadarHighlight.mockReturnValue({
      highlightedIds: [],
      filterMatchIds: new Set<string>(),
      filterActive: false,
      hasFilter: false,
      suppressTooltips: false,
      activeFlags: new Set(),
      activeTags: new Set(),
      activeTeams: new Set(),
      setHighlight: vi.fn(),
      setHighlightPreview,
      toggleFlag: vi.fn(),
      toggleTag: vi.fn(),
      toggleTeam: vi.fn(),
      clearFilters: vi.fn(),
    });
    const onWedgeCommit = vi.fn();

    const { container, rerender } = render(
      <Chart
        size={800}
        segments={segments}
        rings={rings}
        items={items}
        onWedgeCommit={onWedgeCommit}
      />,
    );
    const wedge = container.querySelector('a[href$="/tools#ring-adopt"]');
    expect(wedge).not.toBeNull();
    if (!wedge) return;

    fireEvent.pointerDown(wedge);

    expect(onWedgeCommit).toHaveBeenCalledTimes(1);
    expect(onWedgeCommit).toHaveBeenCalledWith([]);

    rerender(
      <Chart
        size={800}
        segments={segments}
        rings={rings}
        items={items}
        onWedgeCommit={onWedgeCommit}
      />,
    );

    const reactBlipAfter = container.querySelector('a[data-item-id="react"]');
    const rustBlipAfter = container.querySelector('a[data-item-id="rust"]');
    expect(reactBlipAfter?.getAttribute("class") ?? "").not.toMatch(
      /highlighted|dimmed/,
    );
    expect(rustBlipAfter?.getAttribute("class") ?? "").not.toMatch(
      /highlighted|dimmed/,
    );
  });
});
