import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { Team, Teams } from "../Teams";

interface MockChipProps {
  kind?: string;
  children?: ReactNode;
  iconSlot?: ReactNode;
  compact?: boolean;
}

vi.mock("@/components/Chip/Chip", () => ({
  Chip: ({ kind, children, compact }: MockChipProps) => (
    <span
      data-testid="chip"
      data-kind={kind}
      data-compact={compact ? "true" : "false"}
    >
      {children}
    </span>
  ),
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PIcon: ({ name }: { name?: string }) => (
    <span data-testid="p-icon" data-name={name} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Team", () => {
  it("renders the default variant as a Chip with kind=team", () => {
    render(<Team team="Platform" />);

    const chip = screen.getByTestId("chip");
    expect(chip).toHaveTextContent("Platform");
    expect(chip).toHaveAttribute("data-kind", "team");
  });

  it("renders the added variant as a Chip with kind=team-added", () => {
    render(<Team team="Platform" variant="added" />);

    const chip = screen.getByTestId("chip");
    expect(chip).toHaveAttribute("data-kind", "team-added");
    expect(chip).toHaveTextContent("Platform");
  });

  it("renders the removed variant as a Chip with kind=team-removed and applies the removed class", () => {
    render(<Team team="Platform" variant="removed" />);

    const chip = screen.getByTestId("chip");
    expect(chip).toHaveAttribute("data-kind", "team-removed");
    expect(chip.parentElement).toHaveClass("teamRemoved");
  });

  it("renders as a plain span (not a link) when no href is provided", () => {
    render(<Team team="Platform" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders as a Link with the given href when href is provided", () => {
    render(<Team team="Platform" href="/?teams=Platform" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/?teams=Platform");
    expect(link).toContainElement(screen.getByTestId("chip"));
  });
});

describe("Teams", () => {
  it("merges and sorts current and removed teams", () => {
    render(
      <Teams teams={["Platform", "Architecture"]} removedTeams={["Backend"]} />,
    );

    const labels = screen
      .queryAllByTestId("chip")
      .map((el) => el.textContent ?? "")
      .sort((a, b) => a.localeCompare(b));

    expect(labels).toEqual(["Architecture", "Backend", "Platform"]);
  });

  it("assigns kind=team to default, kind=team-removed to removed, kind=team-added to added", () => {
    render(
      <Teams
        teams={["Platform", "Architecture"]}
        addedTeams={["Platform"]}
        removedTeams={["Backend"]}
      />,
    );

    const architectureChip = screen.getByText("Architecture");
    expect(architectureChip).toHaveAttribute("data-kind", "team");

    const backendChip = screen.getByText("Backend");
    expect(backendChip).toHaveAttribute("data-kind", "team-removed");

    const platformChip = screen.getByText("Platform");
    expect(platformChip).toHaveAttribute("data-kind", "team-added");
  });

  it("renders empty for empty arrays", () => {
    const { container } = render(<Teams teams={[]} />);

    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it("renders default-variant teams as links when getTeamHref returns a value", () => {
    render(
      <Teams
        teams={["Platform", "Architecture"]}
        getTeamHref={(team) => `/?teams=${encodeURIComponent(team)}`}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/?teams=Architecture");
    expect(links[1]).toHaveAttribute("href", "/?teams=Platform");
  });

  it("does not link added or removed teams even when getTeamHref is provided", () => {
    render(
      <Teams
        teams={["Platform"]}
        addedTeams={["Platform"]}
        removedTeams={["Backend"]}
        getTeamHref={(team) => `/?teams=${team}`}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not link teams when getTeamHref returns undefined", () => {
    render(<Teams teams={["Platform"]} getTeamHref={() => undefined} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
