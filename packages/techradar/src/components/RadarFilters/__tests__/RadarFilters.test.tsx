import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { getFlags, getTags, getTeams, getToggle } from "@/lib/data";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { RadarFilters } from "../RadarFilters";

vi.mock("@/lib/data", () => ({
  getFlags: vi.fn(),
  getTags: vi.fn(),
  getTeams: vi.fn(),
  getToggle: vi.fn(),
}));

vi.mock("@/lib/RadarHighlightContext", () => ({
  useRadarHighlight: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/components/Chip/Chip", () => ({
  Chip: ({ kind, children }: { kind?: string; children?: ReactNode }) => (
    <span data-testid="chip" data-kind={kind}>
      {children}
    </span>
  ),
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PIcon: ({ name }: { name?: string }) => (
    <span data-testid="p-icon" data-icon={name} />
  ),
  PTag: ({
    children,
    icon,
    variant,
  }: {
    children?: ReactNode;
    icon?: string;
    variant?: string;
  }) => (
    <span data-testid="p-tag" data-icon={icon} data-variant={variant}>
      {children}
    </span>
  ),
}));

const mockGetFlags = getFlags as ReturnType<typeof vi.fn>;
const mockGetTags = getTags as ReturnType<typeof vi.fn>;
const mockGetTeams = getTeams as ReturnType<typeof vi.fn>;
const mockGetToggle = getToggle as ReturnType<typeof vi.fn>;
const mockUseRadarHighlight = useRadarHighlight as ReturnType<typeof vi.fn>;

describe("RadarFilters", () => {
  beforeEach(() => {
    mockGetFlags.mockReturnValue({
      new: { title: "New" },
      changed: { title: "Changed" },
    });
    mockGetTags.mockReturnValue(["frontend"]);
    mockGetTeams.mockReturnValue(["platform"]);
    mockGetToggle.mockImplementation((key: string) => key !== "showChart");
    mockUseRadarHighlight.mockReturnValue({
      activeFlags: new Set(["new"]),
      activeTags: new Set(["frontend"]),
      activeTeams: new Set(["platform"]),
      filterActive: true,
      toggleFlag: vi.fn(),
      toggleTag: vi.fn(),
      toggleTeam: vi.fn(),
      clearFilters: vi.fn(),
    });
  });

  // Regression (Commit G): status/tag/team filter pills must use the themable
  // Chip primitive so theme.json `chips.{status,tag,team}` colors apply,
  // instead of the un-themable PDS PTag variants.
  it("renders status pills as Chip kind=status", () => {
    render(<RadarFilters />);

    const statusChips = screen
      .getAllByTestId("chip")
      .filter((el) => el.getAttribute("data-kind") === "status");
    expect(statusChips.length).toBeGreaterThan(0);
  });

  it("renders the tag pill as Chip kind=tag", () => {
    render(<RadarFilters />);

    const tagChip = screen
      .getAllByTestId("chip")
      .find((el) => el.textContent === "frontend");
    expect(tagChip).toBeDefined();
    expect(tagChip).toHaveAttribute("data-kind", "tag");
  });

  it("renders the team pill as Chip kind=team", () => {
    render(<RadarFilters />);

    const teamChip = screen
      .getAllByTestId("chip")
      .find((el) => el.textContent === "platform");
    expect(teamChip).toBeDefined();
    expect(teamChip).toHaveAttribute("data-kind", "team");
  });

  // Regression (Commit G): the "clear all filters" control is neutral UI, not
  // a status/tag/team chip — it intentionally stays a PDS PTag(secondary).
  it("keeps the clear-all control as PDS PTag(secondary)", () => {
    render(<RadarFilters />);

    const clearAll = screen.getByText("clear all filters");
    expect(clearAll).toHaveAttribute("data-testid", "p-tag");
    expect(clearAll).toHaveAttribute("data-variant", "secondary");
  });
});
