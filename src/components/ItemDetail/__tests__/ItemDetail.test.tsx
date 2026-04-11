import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

import { ItemDetail } from "@/components/ItemDetail/ItemDetail";
import { Flag, type Item, type Revision, type Ring } from "@/lib/types";

const mockState = vi.hoisted(() => ({
  getEditUrl: vi.fn(),
  getLabel: vi.fn(),
  getReleases: vi.fn(),
  getRing: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  getEditUrl: mockState.getEditUrl,
  getLabel: mockState.getLabel,
  getReleases: mockState.getReleases,
  getRing: mockState.getRing,
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PButtonPure: ({ children, ...props }: ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
  PHeading: ({ children, ...props }: ComponentProps<"h1">) => (
    <h1 {...props}>{children}</h1>
  ),
  PIcon: (props: ComponentProps<"span">) => <span {...props} />,
  PInlineNotification: (
    props: ComponentProps<"div"> & { description?: string },
  ) => {
    const { description, ...rest } = props;
    return (
      <div data-description={description} {...rest}>
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
    color: "#00aa00",
    radius: 0.25,
    strokeWidth: 0.1,
  },
  trial: {
    id: "trial",
    title: "Trial",
    description: "Use carefully",
    color: "#ffaa00",
    radius: 0.5,
    strokeWidth: 0.1,
  },
  assess: {
    id: "assess",
    title: "Assess",
    description: "Explore",
    color: "#0088ff",
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
    quadrant: "languages-and-frameworks",
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
    ...render(
      <ItemDetail item={item} quadrantTitle="Languages & Frameworks" />,
    ),
  };
}

describe("ItemDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("renders the item title, ring, quadrant link, tags, teams, body, and edit link", () => {
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
});
