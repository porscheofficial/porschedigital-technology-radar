import { fireEvent, render, screen } from "@testing-library/react";
import type { Item, Quadrant, Ring } from "@/lib/types";
import { Flag } from "@/lib/types";
import QuadrantPage from "@/pages/[quadrant]/index";

const mockState = vi.hoisted(() => ({
  highlight: {
    highlightedIds: [],
    filterActive: false,
    activeFlags: new Set<string>(),
    activeTags: new Set<string>(),
    activeTeams: new Set<string>(),
    setHighlight: vi.fn(),
    toggleFlag: vi.fn(),
    toggleTag: vi.fn(),
    toggleTeam: vi.fn(),
    clearFilters: vi.fn(),
  },
  getAppName: vi.fn(),
  getItems: vi.fn(),
  getQuadrant: vi.fn(),
  getQuadrants: vi.fn(),
  getRing: vi.fn(),
  getRings: vi.fn(),
  groupItemsByRing: vi.fn(),
  sortByFeaturedAndTitle: vi.fn(),
  quadrantRadarProps: vi.fn(),
}));

vi.mock("next/head", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PHeading: ({ children, tag = "h2", ...props }: any) => {
    const Tag = tag;
    return <Tag {...props}>{children}</Tag>;
  },
  PTag: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  PText: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));

vi.mock("@/components/QuadrantRadar/QuadrantRadar", () => ({
  QuadrantRadar: (props: any) => {
    mockState.quadrantRadarProps(props);
    return <div data-testid="quadrant-radar" />;
  },
}));

vi.mock("@/lib/RadarHighlightContext", () => ({
  useRadarHighlight: vi.fn(() => mockState.highlight),
  RadarHighlightProvider: ({ children }: any) => children,
}));

vi.mock("@/lib/config", () => ({
  default: { labels: { title: "Test Radar" } },
}));

vi.mock("@/lib/data", () => ({
  getAppName: mockState.getAppName,
  getItems: mockState.getItems,
  getQuadrant: mockState.getQuadrant,
  getQuadrants: mockState.getQuadrants,
  getRing: mockState.getRing,
  getRings: mockState.getRings,
  groupItemsByRing: mockState.groupItemsByRing,
  sortByFeaturedAndTitle: mockState.sortByFeaturedAndTitle,
}));

describe("Quadrant detail page", () => {
  const quadrant: Quadrant = {
    id: "languages-and-frameworks",
    title: "Languages & Frameworks",
    description: "Programming languages and frameworks",
    color: "#0f0",
    position: 1,
  };

  const quadrants: Quadrant[] = [
    quadrant,
    {
      id: "platforms-and-operations",
      title: "Platforms & Operations",
      description: "Platform work",
      color: "#00f",
      position: 2,
    },
  ];

  const rings: Ring[] = [
    {
      id: "adopt",
      title: "Adopt",
      description: "Use now",
      color: "#0f0",
      radius: 0.5,
      strokeWidth: 5,
    },
    {
      id: "trial",
      title: "Trial",
      description: "Pilot it",
      color: "#00f",
      radius: 0.7,
      strokeWidth: 3,
    },
    {
      id: "assess",
      title: "Assess",
      description: "Evaluate it",
      color: "#ff0",
      radius: 0.85,
      strokeWidth: 2,
    },
  ];

  const items: Item[] = [
    {
      id: "react",
      title: "React",
      body: "<p>UI library</p>",
      featured: true,
      ring: "adopt",
      quadrant: quadrant.id,
      flag: Flag.Default,
      release: "2024-01",
      position: [0.1, 0.2],
    },
    {
      id: "deno",
      title: "Deno",
      body: "<p>Runtime</p>",
      featured: false,
      ring: "trial",
      quadrant: quadrant.id,
      flag: Flag.New,
      release: "2024-01",
      position: [0.2, 0.3],
    },
    {
      id: "ember",
      title: "Ember",
      body: "<p>Framework</p>",
      featured: false,
      ring: "trial",
      quadrant: quadrant.id,
      flag: Flag.Changed,
      release: "2024-01",
      position: [0.3, 0.4],
    },
  ];

  const groupedItems = {
    adopt: [items[0]],
    trial: [items[1], items[2]],
    assess: [],
  };

  beforeAll(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.getAppName.mockReturnValue("Test Radar");
    mockState.getQuadrant.mockImplementation((id: string) =>
      quadrants.find((entry) => entry.id === id),
    );
    mockState.getQuadrants.mockReturnValue(quadrants);
    mockState.getRings.mockReturnValue(rings);
    mockState.getItems.mockReturnValue([...items]);
    mockState.groupItemsByRing.mockReturnValue(groupedItems);
    mockState.getRing.mockImplementation((id: string) =>
      rings.find((ring) => ring.id === id),
    );
    mockState.sortByFeaturedAndTitle.mockImplementation((a: Item, b: Item) =>
      a.title.localeCompare(b.title),
    );
  });

  it("renders the quadrant title heading", () => {
    render(<QuadrantPage quadrantId={quadrant.id} />);

    const headings = screen.getAllByRole("heading", {
      name: "Languages & Frameworks",
    });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders QuadrantRadar with only featured items", () => {
    render(<QuadrantPage quadrantId={quadrant.id} />);

    expect(screen.getByTestId("quadrant-radar")).toBeInTheDocument();
    expect(mockState.quadrantRadarProps).toHaveBeenCalledWith(
      expect.objectContaining({
        quadrant,
        allQuadrants: quadrants,
        rings,
        items: [items[0]], // Only featured items (React)
      }),
    );
  });

  it("renders ring sections with items grouped by ring", () => {
    render(<QuadrantPage quadrantId={quadrant.id} />);

    expect(screen.getByRole("heading", { name: "Adopt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trial" })).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Deno")).toBeInTheDocument();
    expect(screen.getByText("Ember")).toBeInTheDocument();
  });

  it("renders item links with the correct hrefs", () => {
    render(<QuadrantPage quadrantId={quadrant.id} />);

    expect(screen.getByRole("link", { name: /React/ })).toHaveAttribute(
      "href",
      "/languages-and-frameworks/react",
    );
    expect(screen.getByRole("link", { name: /Deno/ })).toHaveAttribute(
      "href",
      "/languages-and-frameworks/deno",
    );
  });

  it("shows flag tags only for non-default items", () => {
    render(<QuadrantPage quadrantId={quadrant.id} />);

    expect(screen.getByText("new")).toBeInTheDocument();
    expect(screen.getByText("changed")).toBeInTheDocument();
    expect(screen.queryByText("default")).not.toBeInTheDocument();
  });

  it("shows Hidden tag for non-featured items", () => {
    render(<QuadrantPage quadrantId={quadrant.id} />);

    const hiddenTags = screen.getAllByText("Hidden");
    expect(hiddenTags).toHaveLength(2);
  });

  it("updates highlighted ids on item hover", () => {
    render(<QuadrantPage quadrantId={quadrant.id} />);

    const denoLink = screen.getByRole("link", { name: /Deno/ });
    fireEvent.mouseEnter(denoLink);
    fireEvent.mouseLeave(denoLink);

    expect(mockState.highlight.setHighlight).toHaveBeenNthCalledWith(
      1,
      ["deno"],
      true,
    );
    expect(mockState.highlight.setHighlight).toHaveBeenNthCalledWith(
      2,
      [],
      false,
    );
  });

  it("returns null when the quadrant is not found", () => {
    const { container } = render(<QuadrantPage quadrantId="missing" />);

    expect(container).toBeEmptyDOMElement();
  });
});
