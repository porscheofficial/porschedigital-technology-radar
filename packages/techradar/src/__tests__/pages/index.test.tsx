import { render, screen } from "@testing-library/react";
import type { Item, Ring, Segment } from "@/lib/types";
import { Flag } from "@/lib/types";
import Home from "@/pages/index";

const seoState = vi.hoisted(() => ({
  props: vi.fn(),
}));

const mockData = vi.hoisted(() => ({
  getChartConfig: vi.fn(),
  getItems: vi.fn(),
  getLabel: vi.fn(),
  getSegments: vi.fn(),
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
  getSegments: mockData.getSegments,
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

vi.mock("@/components/MobileSegmentNav/MobileSegmentNav", () => ({
  MobileSegmentNav: (props: any) => {
    mockData.mobileNavProps(props);
    return <nav data-testid="mobile-segment-nav" />;
  },
}));

vi.mock("@/components/SeoHead/SeoHead", () => ({
  SeoHead: (props: any) => {
    seoState.props(props);
    return <div data-testid="seo-head" />;
  },
}));

describe("Home page", () => {
  const segments: Segment[] = [
    {
      id: "languages-and-frameworks",
      title: "Languages & Frameworks",
      description: "Programming stack",
      position: 1,
    },
    {
      id: "platforms-and-operations",
      title: "Platforms & Operations",
      description: "Ops stack",
      position: 2,
    },
  ];

  const rings: Ring[] = [
    {
      id: "adopt",
      title: "Adopt",
      description: "Use broadly",
      radius: 0.5,
      strokeWidth: 5,
    },
    {
      id: "trial",
      title: "Trial",
      description: "Try it",
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
      segment: "languages-and-frameworks",
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
    mockData.getSegments.mockReturnValue(segments);
    mockData.getRings.mockReturnValue(rings);
    mockData.getToggle.mockImplementation((key: string) => key === "showChart");
  });

  it("passes SEO props for the homepage", () => {
    render(<Home />);

    expect(seoState.props).toHaveBeenCalledWith({
      title: "Radar meta description",
      description: "Radar meta description",
      path: "/",
    });
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
      segments,
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

  it("renders MobileSegmentNav when showChart is true", () => {
    render(<Home />);

    expect(screen.getByTestId("mobile-segment-nav")).toBeInTheDocument();
  });

  it("passes segments, items, and rings to MobileSegmentNav", () => {
    render(<Home />);

    expect(mockData.mobileNavProps).toHaveBeenCalledWith({
      segments,
      items: expect.any(Array),
      rings,
    });
  });

  it("does not render MobileSegmentNav when showChart is false", () => {
    mockData.getToggle.mockReturnValue(false);

    render(<Home />);

    expect(screen.queryByTestId("mobile-segment-nav")).not.toBeInTheDocument();
  });
});
