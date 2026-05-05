import { fireEvent, render, screen } from "@testing-library/react";
import type { SegmentChartProps } from "@/components/SegmentRadar/SegmentChart";
import type { Item, Ring, Segment } from "@/lib/types";
import { Flag } from "@/lib/types";
import { SegmentRadar } from "../SegmentRadar";

const segmentChartMock = vi.hoisted(() =>
  vi.fn((_: SegmentChartProps) => <svg data-testid="segment-chart" />),
);

const mockTooltip = vi.hoisted(() => ({
  useRadarTooltip: vi.fn(() => ({
    tooltip: { show: false, text: "", x: 0, y: 0, color: "" },
    tooltipStyle: {},
    tooltipMap: new Map(),
    shownIds: new Set<string>(),
    handleMouseMove: vi.fn(),
    handleMouseLeave: vi.fn(),
  })),
}));

vi.mock("@/components/SegmentRadar/SegmentChart", () => ({
  SegmentChart: segmentChartMock,
}));

vi.mock("@/hooks/useRadarTooltip", () => mockTooltip);

const segment: Segment = {
  id: "platforms",
  title: "Platforms",
  description: "Platform technologies",
  position: 1,
};

const allSegments: Segment[] = [
  segment,
  {
    id: "tools",
    title: "Tools",
    description: "Tooling",
    position: 2,
  },
];

const rings: Ring[] = [
  {
    id: "adopt",
    title: "Adopt",
    description: "Adopt ring",
    radius: 0.25,
    strokeWidth: 2,
  },
];

const items: Item[] = [
  {
    id: "react",
    title: "React",
    body: "React body",
    featured: true,
    ring: "adopt",
    segment: "platforms",
    flag: Flag.Default,
    release: "2025-01-01",
    position: [100, 200],
  },
];

describe("SegmentRadar", () => {
  beforeEach(() => {
    segmentChartMock.mockClear();
    mockTooltip.useRadarTooltip.mockReset();
    mockTooltip.useRadarTooltip.mockReturnValue({
      tooltip: {
        show: true,
        text: "Segment tooltip",
        x: 15,
        y: 25,
        color: "#ff6600",
      },
      tooltipStyle: { left: 15, top: 25, "--tooltip": "#ff6600" },
      tooltipMap: new Map<
        string,
        {
          id: string;
          text: string;
          color: string;
          href: string;
          x: number;
          y: number;
        }
      >([
        [
          "react",
          {
            id: "react",
            text: "React",
            color: "#ff6600",
            href: "/platforms/react",
            x: 110,
            y: 130,
          },
        ],
        [
          "vite",
          {
            id: "vite",
            text: "Vite",
            color: "#00aa88",
            href: "/platforms/vite",
            x: 170,
            y: 190,
          },
        ],
      ]),
      shownIds: new Set(["react"]),
      handleMouseMove: vi.fn(),
      handleMouseLeave: vi.fn(),
    });
  });

  it("renders the segment radar container, chart, tooltip, persistent links, and mouse handlers", () => {
    const activeRings = new Set(["adopt"]);

    render(
      <SegmentRadar
        segment={segment}
        allSegments={allSegments}
        rings={rings}
        items={items}
        activeRings={activeRings}
      />,
    );

    const container = screen.getByRole("img", { name: "Segment radar" });

    expect(container).toBeInTheDocument();
    expect(screen.getByTestId("segment-chart")).toBeInTheDocument();
    expect(screen.getByText("Segment tooltip")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(screen.getByRole("link", { name: "React" })).toHaveAttribute(
      "href",
      "/platforms/react",
    );
    expect(screen.getByRole("link", { name: "Vite" })).toHaveAttribute(
      "href",
      "/platforms/vite",
    );

    const tooltipState = mockTooltip.useRadarTooltip.mock.results[0]?.value;

    fireEvent.mouseMove(container);
    fireEvent.mouseLeave(container);

    expect(tooltipState.handleMouseMove).toHaveBeenCalledTimes(1);
    expect(tooltipState.handleMouseLeave).toHaveBeenCalledTimes(1);
    expect(segmentChartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        segment,
        allSegments,
        rings,
        items,
        activeRings,
      }),
      undefined,
    );
  });
});
