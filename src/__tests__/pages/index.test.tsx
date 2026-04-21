import { render, screen } from "@testing-library/react";
import type { Item, Quadrant, Ring } from "@/lib/types";
import { Flag } from "@/lib/types";
import Home from "@/pages/index";

const mockData = vi.hoisted(() => ({
  getChartConfig: vi.fn(),
  getItems: vi.fn(),
  getLabel: vi.fn(),
  getQuadrants: vi.fn(),
  getRings: vi.fn(),
  getToggle: vi.fn(),
  radarProps: vi.fn(),
  mobileNavProps: vi.fn(),
}));

vi.mock("next/head", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/lib/config", () => ({
  default: { labels: { title: "Test Radar" } },
}));

vi.mock("@/lib/data", () => ({
  getChartConfig: mockData.getChartConfig,
  getItems: mockData.getItems,
  getLabel: mockData.getLabel,
  getQuadrants: mockData.getQuadrants,
  getRings: mockData.getRings,
  getToggle: mockData.getToggle,
}));

vi.mock("@/components/Radar/Radar", () => ({
  Radar: (props: any) => {
    mockData.radarProps(props);
    return <div data-testid="radar" />;
  },
}));

vi.mock("@/components/RadarFilters/RadarFilters", () => ({
  RadarFilters: () => <div data-testid="radar-filters" />,
}));

vi.mock("@/components/MobileQuadrantNav/MobileQuadrantNav", () => ({
  MobileQuadrantNav: (props: any) => {
    mockData.mobileNavProps(props);
    return <nav data-testid="mobile-quadrant-nav" />;
  },
}));

describe("Home page", () => {
  const quadrants: Quadrant[] = [
    {
      id: "languages-and-frameworks",
      title: "Languages & Frameworks",
      description: "Programming stack",
      color: "#0f0",
      position: 1,
    },
    {
      id: "platforms-and-operations",
      title: "Platforms & Operations",
      description: "Ops stack",
      color: "#00f",
      position: 2,
    },
  ];

  const rings: Ring[] = [
    {
      id: "adopt",
      title: "Adopt",
      description: "Use broadly",
      color: "#0f0",
      radius: 0.5,
      strokeWidth: 5,
    },
    {
      id: "trial",
      title: "Trial",
      description: "Try it",
      color: "#00f",
      radius: 0.7,
      strokeWidth: 3,
    },
  ];

  const items: Item[] = [
    {
      id: "react",
      title: "React",
      body: "<p>React</p>",
      featured: true,
      ring: "adopt",
      quadrant: "languages-and-frameworks",
      flag: Flag.Default,
      release: "2024-01",
      position: [0.1, 0.2],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockData.getChartConfig.mockReturnValue({ size: 640, blipSize: 12 });
    mockData.getItems.mockReturnValue(items);
    mockData.getLabel.mockReturnValue("Radar meta description");
    mockData.getQuadrants.mockReturnValue(quadrants);
    mockData.getRings.mockReturnValue(rings);
    mockData.getToggle.mockImplementation((key: string) => key === "showChart");
  });

  it("renders the meta description from getLabel", () => {
    render(<Home />);

    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe("Radar meta description");
  });

  it("renders Radar when the showChart toggle is true", () => {
    render(<Home />);

    expect(screen.getByTestId("radar")).toBeInTheDocument();
  });

  it("renders RadarFilters when the showChart toggle is true", () => {
    render(<Home />);

    expect(screen.getByTestId("radar-filters")).toBeInTheDocument();
  });

  it("passes chart data to Radar", () => {
    render(<Home />);

    expect(mockData.radarProps).toHaveBeenCalledWith({
      size: 640,
      quadrants,
      rings,
      items,
    });
  });

  it("calls getItems with featured=true", () => {
    render(<Home />);

    expect(mockData.getItems).toHaveBeenCalledWith(undefined, true);
  });

  it("does not render Radar or RadarFilters when showChart is false", () => {
    mockData.getToggle.mockReturnValue(false);

    render(<Home />);

    expect(screen.queryByTestId("radar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("radar-filters")).not.toBeInTheDocument();
  });

  it("renders MobileQuadrantNav when showChart is true", () => {
    render(<Home />);

    expect(screen.getByTestId("mobile-quadrant-nav")).toBeInTheDocument();
  });

  it("passes quadrants to MobileQuadrantNav", () => {
    render(<Home />);

    expect(mockData.mobileNavProps).toHaveBeenCalledWith({
      quadrants,
    });
  });

  it("does not render MobileQuadrantNav when showChart is false", () => {
    mockData.getToggle.mockReturnValue(false);

    render(<Home />);

    expect(screen.queryByTestId("mobile-quadrant-nav")).not.toBeInTheDocument();
  });
});
