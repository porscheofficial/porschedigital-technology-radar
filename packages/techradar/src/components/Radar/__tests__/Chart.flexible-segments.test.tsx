import { render } from "@testing-library/react";

import { Chart } from "@/components/Radar/Chart";
import type { Item, Ring, Segment } from "@/lib/types";

vi.mock("@/lib/data", () => ({
  getToggle: vi.fn(() => false),
  getItemChangeDirection: vi.fn(() => undefined),
  getChartConfig: vi.fn(() => ({ size: 800, blipSize: 12 })),
}));

vi.mock("@/lib/RadarHighlightContext", () => ({
  useRadarHighlight: vi.fn(() => ({
    highlightedIds: [],
    filterActive: false,
  })),
}));

const COLORS = [
  "#aa0000",
  "#00aa00",
  "#0000aa",
  "#aaaa00",
  "#aa00aa",
  "#00aaaa",
];

function makeSegments(n: number): Segment[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i + 1}`,
    title: `Segment ${i + 1}`,
    description: `Segment ${i + 1} description`,
    color: COLORS[i] ?? "#888888",
    position: i + 1,
  }));
}

const rings: Ring[] = [
  {
    id: "adopt",
    title: "Adopt",
    description: "Adopt ring",
    color: "#00aa88",
    radius: 0.5,
    strokeWidth: 2,
  },
  {
    id: "trial",
    title: "Trial",
    description: "Trial ring",
    color: "#0088aa",
    radius: 1.0,
    strokeWidth: 2,
  },
];

const items: Item[] = [];

describe("Chart with flexible segment counts", () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    it(`renders ${n} segment(s) without error and produces N×rings arc paths + N labels`, () => {
      const segments = makeSegments(n);
      const { container } = render(
        <Chart size={800} segments={segments} rings={rings} items={items} />,
      );

      const segmentGroups = container.querySelectorAll("g[data-segment]");
      expect(segmentGroups).toHaveLength(n);

      const arcPaths = container.querySelectorAll("g[data-segment] > path");
      expect(arcPaths).toHaveLength(n * rings.length);

      const gradients = container.querySelectorAll("radialGradient");
      expect(gradients).toHaveLength(n);

      const labels = container.querySelectorAll("textPath");
      expect(labels).toHaveLength(n);

      for (const path of arcPaths) {
        const d = path.getAttribute("d");
        expect(d).toBeTruthy();
        expect(d?.length ?? 0).toBeGreaterThan(0);
      }
    });
  }

  it("emits SVG arc with largeArcFlag=1 when sweep > 180° (1 segment, 360°)", () => {
    const segments = makeSegments(1);
    const { container } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const firstArc = container.querySelector("g[data-segment] path");
    expect(firstArc?.getAttribute("d")).toMatch(/A \d+ \d+ 0 1 0/);
  });

  it("emits SVG arc with largeArcFlag=0 when sweep < 180° (5 segments, 72°)", () => {
    const segments = makeSegments(5);
    const { container } = render(
      <Chart size={800} segments={segments} rings={rings} items={items} />,
    );
    const firstArc = container.querySelector("g[data-segment] path");
    expect(firstArc?.getAttribute("d")).toMatch(/A \d+ \d+ 0 0 0/);
  });
});
