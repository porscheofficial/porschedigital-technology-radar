import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  Item,
  ItemTrajectory,
  Ring,
  Segment,
  VersionDiff,
} from "@/lib/types";
import { Flag } from "@/lib/types";
import History from "@/pages/history";

const mockState = vi.hoisted(() => ({
  router: {
    query: {},
    push: vi.fn(),
    back: vi.fn(),
  },
  getAppName: vi.fn(),
  getItemTrajectories: vi.fn(),
  getSegment: vi.fn(),
  getReleases: vi.fn(),
  getRing: vi.fn(),
  getVersionDiffs: vi.fn(),
  seoHeadProps: vi.fn(),
}));

vi.mock("next/head", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("next/router", () => ({
  useRouter: vi.fn(() => mockState.router),
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
  PIcon: ({ name, ...props }: any) => <span {...props}>{name}</span>,
  PTable: ({ children, caption, ...props }: any) => (
    <table {...props}>
      {caption ? <caption>{caption}</caption> : null}
      {children}
    </table>
  ),
  PTableBody: ({ children, ...props }: any) => (
    <tbody {...props}>{children}</tbody>
  ),
  PTableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  PTableHead: ({ children, ...props }: any) => (
    <thead {...props}>{children}</thead>
  ),
  PTableHeadCell: ({ children, ...props }: any) => (
    <th {...props}>{children}</th>
  ),
  PTableHeadRow: ({ children, ...props }: any) => (
    <tr {...props}>{children}</tr>
  ),
  PTableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  PText: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));

vi.mock("@/components/Badge/Badge", () => ({
  RingBadge: ({ ring, size }: any) => (
    <span data-testid={`ring-badge-${ring}-${size}`}>{ring}</span>
  ),
}));

vi.mock("@/components/Teams/Teams", () => ({
  Team: ({ team, variant }: any) => (
    <span data-testid={`team-${team}-${variant ?? "default"}`}>
      {team}:{variant ?? "default"}
    </span>
  ),
}));

vi.mock("@/components/SeoHead/SeoHead", () => ({
  SeoHead: (props: any) => {
    mockState.seoHeadProps(props);
    return <div data-testid="seo-head" />;
  },
}));

vi.mock("@/lib/config", () => ({
  default: { labels: { title: "Test Radar" } },
}));

vi.mock("@/lib/data", () => ({
  getAppName: mockState.getAppName,
  getItemTrajectories: mockState.getItemTrajectories,
  getSegment: mockState.getSegment,
  getReleases: mockState.getReleases,
  getRing: mockState.getRing,
  getVersionDiffs: mockState.getVersionDiffs,
}));

describe("History page", () => {
  const releases = [
    "2023-01",
    "2023-03",
    "2023-05",
    "2023-07",
    "2023-09",
    "2023-11",
    "2024-01",
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
      description: "Try it",
      color: "#00f",
      radius: 0.7,
      strokeWidth: 3,
    },
    {
      id: "assess",
      title: "Assess",
      description: "Assess it",
      color: "#ff0",
      radius: 0.85,
      strokeWidth: 2,
    },
    {
      id: "hold",
      title: "Hold",
      description: "Avoid it",
      color: "#f00",
      radius: 1,
      strokeWidth: 1,
    },
  ];

  const segments: Segment[] = [
    {
      id: "languages-and-frameworks",
      title: "Languages & Frameworks",
      description: "Frontend and backend languages",
      color: "#0f0",
      position: 1,
    },
    {
      id: "platforms-and-operations",
      title: "Platforms & Operations",
      description: "Platform work",
      color: "#00f",
      position: 2,
    },
  ];

  const baseItems: Record<string, Item> = {
    api: {
      id: "api",
      title: "Platform API",
      body: "<p>API</p>",
      featured: true,
      ring: "adopt",
      segment: "languages-and-frameworks",
      flag: Flag.Default,
      release: "2024-01",
      position: [0.1, 0.2],
      teams: ["platform"],
      revisions: [],
    },
    legacy: {
      id: "legacy",
      title: "Legacy CMS",
      body: "<p>CMS</p>",
      featured: false,
      ring: "hold",
      segment: "platforms-and-operations",
      flag: Flag.Changed,
      release: "2024-01",
      position: [0.2, 0.3],
      teams: ["web"],
      revisions: [],
    },
    ai: {
      id: "ai",
      title: "AI Assistant",
      body: "<p>AI</p>",
      featured: false,
      ring: "trial",
      segment: "languages-and-frameworks",
      flag: Flag.New,
      release: "2024-01",
      position: [0.3, 0.4],
      teams: ["innovation"],
      revisions: [],
    },
  };

  const trajectories: ItemTrajectory[] = [
    {
      item: baseItems.api,
      rings: ["hold", "hold", "assess", "assess", "trial", "trial", "adopt"],
    },
    {
      item: baseItems.legacy,
      rings: ["trial", "trial", "assess", "assess", "hold", "hold", "hold"],
    },
    {
      item: baseItems.ai,
      rings: [null, null, null, null, null, null, "trial"],
    },
  ];

  const diffs: VersionDiff[] = [
    {
      release: "2024-01",
      promoted: [{ item: baseItems.api, from: "trial", to: "adopt" }],
      demoted: [{ item: baseItems.legacy, from: "assess", to: "hold" }],
      newItems: [{ item: baseItems.ai, ring: "trial" }],
      teamChanges: [
        { item: baseItems.api, added: ["platform"], removed: ["legacy"] },
      ],
    },
    {
      release: "2023-11",
      promoted: [],
      demoted: [],
      newItems: [],
      teamChanges: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.router.push.mockReset();
    mockState.getAppName.mockReturnValue("Test Radar");
    mockState.getItemTrajectories.mockReturnValue(trajectories);
    mockState.getSegment.mockImplementation((id: string) =>
      segments.find((segment) => segment.id === id),
    );
    mockState.getReleases.mockReturnValue(releases);
    mockState.getRing.mockImplementation((id: string) =>
      rings.find((ring) => ring.id === id),
    );
    mockState.getVersionDiffs.mockReturnValue(diffs);
  });

  it("renders the Changelog heading", () => {
    render(<History />);

    expect(
      screen.getByRole("heading", { name: "Changelog" }),
    ).toBeInTheDocument();
  });

  it("renders the page section links in the TOC", () => {
    render(<History />);

    expect(
      screen.getByRole("link", { name: "Ring trajectory" }),
    ).toHaveAttribute("href", "#ring-trajectory");
    expect(
      screen.getByRole("link", { name: "Detailed changelog" }),
    ).toHaveAttribute("href", "#detailed-changelog");
  });

  it("renders release links in the TOC for each diff", () => {
    render(<History />);

    expect(screen.getByRole("link", { name: "Jan 24" })).toHaveAttribute(
      "href",
      "#release-2024-01",
    );
    expect(screen.getByRole("link", { name: "Nov 23" })).toHaveAttribute(
      "href",
      "#release-2023-11",
    );
  });

  it("renders the ring trajectory table with the last six release columns by default", () => {
    render(<History />);

    expect(
      screen.getByRole("table", { name: "Ring trajectory across releases" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Jan 24")).toHaveLength(2);
    expect(
      screen.getByRole("columnheader", { name: "Mar 23" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Jan 23" }),
    ).not.toBeInTheDocument();
  });

  it("shows all releases when the toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<History />);

    await user.click(
      screen.getByRole("button", { name: "Show all 7 versions" }),
    );

    expect(screen.getByText("Jan 23")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show last 6 versions" }),
    ).toBeInTheDocument();
  });

  it("shows fewer releases again after toggling back", async () => {
    const user = userEvent.setup();
    render(<History />);

    await user.click(
      screen.getByRole("button", { name: "Show all 7 versions" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Show last 6 versions" }),
    );

    expect(screen.queryByText("Jan 23")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show all 7 versions" }),
    ).toBeInTheDocument();
  });

  it("renders the detailed changelog section for each diff", () => {
    render(<History />);

    expect(screen.getByText("January 2024")).toBeInTheDocument();
    expect(screen.getByText("November 2023")).toBeInTheDocument();
    expect(screen.getByText("Latest")).toBeInTheDocument();
  });

  it("renders promoted and demoted change groups", () => {
    render(<History />);

    expect(screen.getByText("▲ Promoted")).toBeInTheDocument();
    expect(screen.getAllByText("Platform API").length).toBeGreaterThan(0);
    expect(screen.getByText("▼ Demoted")).toBeInTheDocument();
    expect(screen.getAllByText("Legacy CMS").length).toBeGreaterThan(0);
  });

  it("renders the new items group with segment details", () => {
    render(<History />);

    expect(screen.getByText("✦ New")).toBeInTheDocument();
    expect(screen.getAllByText("AI Assistant").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Languages & Frameworks").length,
    ).toBeGreaterThan(0);
  });

  it("renders team change groups with added and removed teams", () => {
    render(<History />);

    expect(screen.getByText(/Team changes/)).toBeInTheDocument();
    expect(screen.getByTestId("team-platform-added")).toBeInTheDocument();
    expect(screen.getByTestId("team-legacy-removed")).toBeInTheDocument();
  });

  it("renders the baseline message for an empty diff", () => {
    render(<History />);

    expect(screen.getByText(/Initial radar version/)).toBeInTheDocument();
  });

  it("navigates to the item detail page when a trajectory row is clicked", async () => {
    const user = userEvent.setup();
    render(<History />);

    const row = screen
      .getByRole("link", { name: "Platform API" })
      .closest("tr");
    expect(row).not.toBeNull();

    // biome-ignore lint/style/noNonNullAssertion: row confirmed non-null above
    await user.click(row!);

    expect(mockState.router.push).toHaveBeenCalledWith(
      "/languages-and-frameworks/api",
    );
  });
});
