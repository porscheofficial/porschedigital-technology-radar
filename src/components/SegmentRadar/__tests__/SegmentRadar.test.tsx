import { fireEvent, render, screen } from "@testing-library/react";
import type { QuadrantChartProps } from "@/components/QuadrantRadar/QuadrantChart";
import type { Item, Quadrant, Ring } from "@/lib/types";
import { Flag } from "@/lib/types";
import { QuadrantRadar } from "../QuadrantRadar";

const quadrantChartMock = vi.hoisted(() =>
  vi.fn((_: QuadrantChartProps) => <svg data-testid="quadrant-chart" />),
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

vi.mock("@/components/QuadrantRadar/QuadrantChart", () => ({
  QuadrantChart: quadrantChartMock,
}));

vi.mock("@/hooks/useRadarTooltip", () => mockTooltip);

const quadrant: Quadrant = {
  id: "platforms",
  title: "Platforms",
  description: "Platform technologies",
  color: "#ff6600",
  position: 1,
};

const allQuadrants: Quadrant[] = [
  quadrant,
  {
    id: "tools",
    title: "Tools",
    description: "Tooling",
    color: "#00aa88",
    position: 2,
  },
];

const rings: Ring[] = [
  {
    id: "adopt",
    title: "Adopt",
    description: "Adopt ring",
    color: "#00aa88",
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
    quadrant: "platforms",
    flag: Flag.Default,
    release: "2025-01-01",
    position: [100, 200],
  },
];

describe("QuadrantRadar", () => {
  beforeEach(() => {
    quadrantChartMock.mockClear();
    mockTooltip.useRadarTooltip.mockReset();
    mockTooltip.useRadarTooltip.mockReturnValue({
      tooltip: {
        show: true,
        text: "Quadrant tooltip",
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

  it("renders the quadrant radar container, chart, tooltip, persistent links, and mouse handlers", () => {
    const activeRings = new Set(["adopt"]);

    render(
      <QuadrantRadar
        quadrant={quadrant}
        allQuadrants={allQuadrants}
        rings={rings}
        items={items}
        activeRings={activeRings}
      />,
    );

    const container = screen.getByRole("img", { name: "Quadrant radar" });

    expect(container).toBeInTheDocument();
    expect(screen.getByTestId("quadrant-chart")).toBeInTheDocument();
    expect(screen.getByText("Quadrant tooltip")).toBeInTheDocument();

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
    expect(quadrantChartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quadrant,
        allQuadrants,
        rings,
        items,
        activeRings,
      }),
      undefined,
    );
  });
});
