import { fireEvent, render, screen } from "@testing-library/react";
import type { ChartProps } from "@/components/Radar/Chart";
import type { Item, Ring, Segment } from "@/lib/types";
import { Flag } from "@/lib/types";
import { Radar } from "../Radar";

const chartMock = vi.hoisted(() =>
  vi.fn((_: ChartProps) => <svg data-testid="chart" />),
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

vi.mock("@/components/Radar/Chart", () => ({
  Chart: chartMock,
}));

vi.mock("@/hooks/useRadarTooltip", () => mockTooltip);

const segments: Segment[] = [
  {
    id: "platforms",
    title: "Platforms",
    description: "Platform technologies",
    position: 1,
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

describe("Radar", () => {
  beforeEach(() => {
    chartMock.mockClear();
    mockTooltip.useRadarTooltip.mockReset();
    mockTooltip.useRadarTooltip.mockReturnValue({
      tooltip: {
        show: true,
        text: "Hover tooltip",
        x: 20,
        y: 30,
        color: "#ff6600",
      },
      tooltipStyle: { left: 20, top: 30, "--tooltip": "#ff6600" },
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
            x: 100,
            y: 120,
          },
        ],
        [
          "nextjs",
          {
            id: "nextjs",
            text: "Next.js",
            color: "#00aa88",
            href: "/platforms/nextjs",
            x: 160,
            y: 180,
          },
        ],
      ]),
      shownIds: new Set(["react", "nextjs"]),
      handleMouseMove: vi.fn(),
      handleMouseLeave: vi.fn(),
    });
  });

  it("renders the radar container, chart, tooltip, persistent links, and mouse handlers", () => {
    render(
      <Radar size={640} segments={segments} rings={rings} items={items} />,
    );

    const container = screen.getByRole("img", { name: "Technology radar" });

    expect(container).toBeInTheDocument();
    expect(screen.getByTestId("chart")).toBeInTheDocument();
    expect(screen.getByText("Hover tooltip")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(screen.getByRole("link", { name: "React" })).toHaveAttribute(
      "href",
      "/platforms/react",
    );
    expect(screen.getByRole("link", { name: "Next.js" })).toHaveAttribute(
      "href",
      "/platforms/nextjs",
    );

    const tooltipState = mockTooltip.useRadarTooltip.mock.results[0]?.value;

    fireEvent.mouseMove(container);
    fireEvent.mouseLeave(container);

    expect(tooltipState.handleMouseMove).toHaveBeenCalledTimes(1);
    expect(tooltipState.handleMouseLeave).toHaveBeenCalledTimes(1);
    expect(chartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 640,
        segments,
        rings,
        items,
      }),
      undefined,
    );
  });

  it("uses 800 as the default chart size", () => {
    render(<Radar segments={segments} rings={rings} items={items} />);

    expect(chartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 800,
        segments,
        rings,
        items,
      }),
      undefined,
    );
  });
});
