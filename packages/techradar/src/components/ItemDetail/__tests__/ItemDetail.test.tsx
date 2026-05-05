import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

import { ItemDetail } from "@/components/ItemDetail/ItemDetail";
import { useTheme } from "@/lib/ThemeContext";
import { Flag, type Item, type Revision, type Ring } from "@/lib/types";

const mockState = vi.hoisted(() => ({
  getEditUrl: vi.fn(),
  getLabel: vi.fn(),
  getReleases: vi.fn(),
  getRing: vi.fn(),
  getRings: vi.fn(),
  getToggle: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  getEditUrl: mockState.getEditUrl,
  getLabel: mockState.getLabel,
  getReleases: mockState.getReleases,
  getRing: mockState.getRing,
  getRings: mockState.getRings,
  getToggle: mockState.getToggle,
}));

vi.mock("@/lib/ThemeContext", () => ({
  useTheme: vi.fn(),
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PButtonPure: ({ children, ...props }: ComponentProps<"button">) => (
    <button data-testid="p-button-pure" {...props}>
      {children}
    </button>
  ),
  PHeading: ({ children, ...props }: ComponentProps<"h1">) => (
    <h1 data-testid="p-heading" {...props}>
      {children}
    </h1>
  ),
  PIcon: (props: ComponentProps<"span">) => (
    <span data-testid="p-icon" {...props} />
  ),
  PInlineNotification: (
    props: ComponentProps<"div"> & { description?: string },
  ) => {
    const { description, ...rest } = props;
    return (
      <div
        data-testid="p-inline-notification"
        data-description={description}
        {...rest}
      >
        {description}
      </div>
    );
  },
  PLinkPure: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
  PTag: ({ children, ...props }: ComponentProps<"span">) => (
    <span {...props}>{children}</span>
  ),
}));

const mockUseTheme = useTheme as ReturnType<typeof vi.fn>;

function makeTheme() {
  return {
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
      cssVariables: {
        foreground: "#FBFCFF",
        background: "#0E0E12",
        highlight: "#FBFCFF",
        content: "#AFB0B3",
        text: "#88898C",
        link: "#FBFCFF",
        border: "#404044",
        tag: "#404044",
        surface: "#212225",
        footer: "#212225",
        shading: "rgba(38, 38, 41, 0.67)",
        frosted: "rgba(64, 64, 68, 0.35)",
      },
      radar: {
        segments: ["#aa0000", "#00aa00", "#0000aa", "#aaaa00"],
        rings: ["#00aa88", "#0088aa", "#aa8800", "#888888"],
      },
      assetsResolved: {},
    },
    themes: [],
    setActiveTheme: vi.fn(),
    setMode: vi.fn(),
  };
}

vi.mock("@/components/Icons", () => ({
  DescriptionEdit: ({ className }: { className?: string }) => (
    <svg data-testid="description-edit-icon" className={className} />
  ),
  RingChange: ({ className }: { className?: string }) => (
    <svg data-testid="ring-change-icon" className={className} />
  ),
  RingInitial: ({ className }: { className?: string }) => (
    <svg data-testid="ring-initial-icon" className={className} />
  ),
}));

const rings: Record<string, Ring> = {
  adopt: {
    id: "adopt",
    title: "Adopt",
    description: "Use broadly",
    radius: 0.25,
    strokeWidth: 0.1,
  },
  trial: {
    id: "trial",
    title: "Trial",
    description: "Use carefully",
    radius: 0.5,
    strokeWidth: 0.1,
  },
  assess: {
    id: "assess",
    title: "Assess",
    description: "Explore",
    radius: 0.75,
    strokeWidth: 0.1,
  },
};

function createRevision(overrides: Partial<Revision> = {}): Revision {
  return {
    release: "2025-07-01",
    ring: "adopt",
    ...overrides,
  };
}

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "react",
    title: "React",
    body: "<p>Item <strong>body</strong></p>",
    featured: true,
    ring: "adopt",
    segment: "languages-and-frameworks",
    flag: Flag.Default,
    tags: ["frontend", "typescript"],
    release: "2025-07-01",
    revisions: [],
    position: [0.1, 0.2],
    teams: ["Team Alpha", "Team Beta"],
    ...overrides,
  };
}

function renderItemDetail(overrides: Partial<Item> = {}) {
  const item = createItem(overrides);
  return {
    item,
    ...render(<ItemDetail item={item} segmentTitle="Languages & Frameworks" />),
  };
}

describe("ItemDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReset();
    mockUseTheme.mockReturnValue(makeTheme());
    mockState.getEditUrl.mockReturnValue("https://example.com/edit/react");
    mockState.getLabel.mockImplementation((label: string) => {
      if (label === "notUpdated") return "Not maintained text";
      if (label === "hiddenFromRadar") return "Hidden text";
      return "";
    });
    mockState.getReleases.mockReturnValue([
      "2024-07-01",
      "2025-01-15",
      "2025-07-01",
    ]);
    mockState.getRing.mockImplementation(
      (ring: string) => rings[ring as keyof typeof rings],
    );
    mockState.getRings.mockReturnValue(Object.values(rings));
    mockState.getToggle.mockImplementation((key: string) => {
      if (key === "showTagFilter") return true;
      if (key === "showTeamFilter") return true;
      return false;
    });
  });

  it("renders the item title, ring, segment link, tags, teams, body, and edit link", () => {
    renderItemDetail();

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Adopt")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /languages & frameworks/i }),
    ).toHaveAttribute("href", "/languages-and-frameworks");
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
    expect(
      screen.getByText("body", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit/i })).toHaveAttribute(
      "href",
      "https://example.com/edit/react",
    );
  });

  it("shows the not maintained notification when the release is older than the last three releases", () => {
    renderItemDetail({ release: "2024-01-15" });

    expect(screen.getByText("Not maintained text")).toBeInTheDocument();
  });

  it("does not show the not maintained notification when the release is recent", () => {
    renderItemDetail({ release: "2025-07-01" });

    expect(screen.queryByText("Not maintained text")).not.toBeInTheDocument();
  });

  it("shows the hidden from radar notification when the item is not featured", () => {
    renderItemDetail({ featured: false });

    expect(screen.getByText("Hidden text")).toBeInTheDocument();
  });

  it("does not show the hidden from radar notification when the item is featured", () => {
    renderItemDetail({ featured: true });

    expect(screen.queryByText("Hidden text")).not.toBeInTheDocument();
  });

  it("hides the edit link when no edit URL is available", () => {
    mockState.getEditUrl.mockReturnValue("");

    renderItemDetail();

    expect(
      screen.queryByRole("link", { name: /edit/i }),
    ).not.toBeInTheDocument();
  });

  it("computes the tenure date and last transition from revisions", () => {
    renderItemDetail({
      revisions: [
        createRevision({
          release: "2025-07-01",
          ring: "adopt",
          previousRing: "trial",
        }),
        createRevision({ release: "2024-01-15", ring: "adopt" }),
        createRevision({ release: "2024-06-01", ring: "assess" }),
      ],
    });

    expect(screen.getByText("Since Jan 2024")).toBeInTheDocument();
    expect(screen.getByText("Trial → Adopt")).toBeInTheDocument();
  });

  it("renders the revision history timeline when revisions exist", () => {
    const { container } = renderItemDetail({
      revisions: [
        createRevision({ release: "2025-07-01", previousRing: "trial" }),
      ],
    });

    expect(container.querySelector(".timeline")).toBeInTheDocument();
    expect(screen.getByText("Jul 2025")).toBeInTheDocument();
  });

  it.each([
    { revisions: undefined, label: "undefined" },
    { revisions: [], label: "empty" },
  ])("does not render the revision history timeline when revisions are $label", ({
    revisions,
  }) => {
    const { container } = renderItemDetail({ revisions });

    expect(container.querySelector(".timeline")).not.toBeInTheDocument();
  });

  it("renders ring changes, initial entries, body changes, and team changes in history groups", () => {
    renderItemDetail({
      revisions: [
        createRevision({
          release: "2025-07-01",
          ring: "adopt",
          previousRing: "trial",
          body: "<p>Updated revision text</p>",
          addedTeams: ["Platform Team"],
          removedTeams: ["Legacy Team"],
        }),
        createRevision({
          release: "2025-01-15",
          ring: "adopt",
          body: "<p>Inherited revision text</p>",
          bodyInherited: true,
        }),
        createRevision({
          release: "2024-01-15",
          ring: "trial",
          teams: ["Founding Team"],
        }),
      ],
    });

    const ringChangeGroup = screen.getByText("Jul 2025").closest(".dateGroup");
    expect(ringChangeGroup).not.toBeNull();
    expect(
      within(ringChangeGroup as HTMLElement).getByTestId("ring-change-icon"),
    ).toBeInTheDocument();
    expect(
      within(ringChangeGroup as HTMLElement).getByText("Trial"),
    ).toBeInTheDocument();
    expect(
      within(ringChangeGroup as HTMLElement).getAllByText("Adopt")[0],
    ).toBeInTheDocument();
    expect(
      within(ringChangeGroup as HTMLElement).getByText("Updated revision text"),
    ).toBeInTheDocument();
    expect(
      within(ringChangeGroup as HTMLElement).getByText("Platform Team"),
    ).toBeInTheDocument();
    expect(
      within(ringChangeGroup as HTMLElement).getByText("Legacy Team"),
    ).toBeInTheDocument();

    const inheritedBodyGroup = screen
      .getByText("Jan 2025")
      .closest(".dateGroup");
    expect(inheritedBodyGroup).not.toBeNull();
    expect(
      within(inheritedBodyGroup as HTMLElement).queryByText(
        "Inherited revision text",
      ),
    ).not.toBeInTheDocument();

    const initialGroup = screen.getByText("Jan 2024").closest(".dateGroup");
    expect(initialGroup).not.toBeNull();
    expect(
      within(initialGroup as HTMLElement).getByTestId("ring-initial-icon"),
    ).toBeInTheDocument();
    expect(
      within(initialGroup as HTMLElement).getByText("Founding Team"),
    ).toBeInTheDocument();
    expect(
      within(initialGroup as HTMLElement).getByText("Trial"),
    ).toBeInTheDocument();
  });

  it("renders short description changes without a more button", () => {
    renderItemDetail({
      revisions: [
        createRevision({
          release: "2025-07-01",
          body: "<p>Short revision note.</p>",
        }),
      ],
    });

    expect(screen.getByText("Short revision note.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "more" }),
    ).not.toBeInTheDocument();
  });

  it("renders long description changes truncated and expands them on demand", async () => {
    const user = userEvent.setup();
    const longBody = `<p>${"Long revision text ".repeat(7)}<strong>with full HTML content</strong></p>`;

    renderItemDetail({
      revisions: [
        createRevision({
          release: "2025-07-01",
          body: longBody,
        }),
      ],
    });

    expect(screen.getByRole("button", { name: "more" })).toBeInTheDocument();
    expect(screen.getByText(/Long revision text/)).toHaveTextContent("…");
    expect(
      screen.queryByText("with full HTML content", { selector: "strong" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "more" }));

    expect(
      screen.getByText("with full HTML content", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "more" }),
    ).not.toBeInTheDocument();
  });

  describe("links section", () => {
    it("renders links with custom names below the description", () => {
      renderItemDetail({
        links: [
          { url: "https://example.com/docs", name: "Documentation" },
          { url: "https://github.com/example/repo", name: "GitHub" },
        ],
      });

      expect(screen.getByText("Links")).toBeInTheDocument();

      const docsLink = screen.getByRole("link", { name: "Documentation" });
      expect(docsLink).toHaveAttribute("href", "https://example.com/docs");
      expect(docsLink).toHaveAttribute("target", "_blank");

      const githubLink = screen.getByRole("link", { name: "GitHub" });
      expect(githubLink).toHaveAttribute(
        "href",
        "https://github.com/example/repo",
      );
    });

    it("renders links without names using the formatted URL", () => {
      renderItemDetail({
        links: [{ url: "https://www.example.com/path/to/page" }],
      });

      expect(
        screen.getByRole("link", { name: "example.com/path/to/page" }),
      ).toBeInTheDocument();
    });

    it("does not render the links section when links is undefined", () => {
      renderItemDetail({ links: undefined });

      expect(screen.queryByText("Links")).not.toBeInTheDocument();
    });

    it("does not render the links section when links is empty", () => {
      renderItemDetail({ links: [] });

      expect(screen.queryByText("Links")).not.toBeInTheDocument();
    });

    it("renders links even when body is empty", () => {
      renderItemDetail({
        body: "",
        links: [{ url: "https://example.com", name: "Example" }],
      });

      expect(screen.getByRole("link", { name: "Example" })).toHaveAttribute(
        "href",
        "https://example.com",
      );
    });
  });

  describe("tag and team filter links", () => {
    it("renders tag badges as links to the home page with the tag filter when showTagFilter is enabled", () => {
      renderItemDetail({ tags: ["frontend"] });

      const tagLink = screen.getByRole("link", { name: /frontend/i });
      expect(tagLink).toHaveAttribute("href", "/?tags=frontend");
    });

    it("renders team badges as links to the home page with the team filter when showTeamFilter is enabled", () => {
      renderItemDetail({ teams: ["Team Alpha"] });

      const teamLink = screen.getByRole("link", { name: /team alpha/i });
      expect(teamLink).toHaveAttribute("href", "/?teams=Team%20Alpha");
    });

    it("renders tag badges as plain (non-link) when showTagFilter is disabled", () => {
      mockState.getToggle.mockImplementation(
        (key: string) => key === "showTeamFilter",
      );

      renderItemDetail({ tags: ["frontend"], teams: [] });

      expect(
        screen.queryByRole("link", { name: /frontend/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("frontend")).toBeInTheDocument();
    });

    it("renders team badges as plain (non-link) when showTeamFilter is disabled", () => {
      mockState.getToggle.mockImplementation(
        (key: string) => key === "showTagFilter",
      );

      renderItemDetail({ tags: [], teams: ["Team Alpha"] });

      expect(
        screen.queryByRole("link", { name: /team alpha/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    });
  });
});
