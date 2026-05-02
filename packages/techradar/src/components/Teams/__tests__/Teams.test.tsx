import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { Team, Teams } from "../Teams";

interface MockPTagProps {
  children?: ReactNode;
  icon?: string;
  variant?: string;
  compact?: boolean;
}

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PTag: ({ children, icon, variant, compact }: MockPTagProps) => (
    <span
      data-testid="p-tag"
      data-icon={icon}
      data-variant={variant}
      data-compact={compact ? "true" : "false"}
    >
      {children}
    </span>
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
  it("renders the team name with the default warning variant", () => {
    render(<Team team="Platform" />);

    expect(screen.getByTestId("p-tag")).toHaveTextContent("Platform");
    expect(screen.getByTestId("p-tag")).toHaveAttribute(
      "data-variant",
      "warning",
    );
  });

  it("renders the added variant as success", () => {
    render(<Team team="Platform" variant="added" />);

    expect(screen.getByTestId("p-tag")).toHaveAttribute(
      "data-variant",
      "success",
    );
  });

  it("renders the removed variant as error with the removed class", () => {
    render(<Team team="Platform" variant="removed" />);

    expect(screen.getByTestId("p-tag")).toHaveAttribute(
      "data-variant",
      "error",
    );
    expect(screen.getByTestId("p-tag").parentElement).toHaveClass(
      "teamRemoved",
    );
  });

  it("renders as a plain span (not a link) when no href is provided", () => {
    render(<Team team="Platform" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders as a Link with the given href when href is provided", () => {
    render(<Team team="Platform" href="/?teams=Platform" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/?teams=Platform");
    expect(link).toContainElement(screen.getByTestId("p-tag"));
  });
});

describe("Teams", () => {
  it("merges and sorts current and removed teams", () => {
    render(
      <Teams teams={["Platform", "Architecture"]} removedTeams={["Backend"]} />,
    );

    expect(
      screen.getAllByTestId("p-tag").map((element) => element.textContent),
    ).toEqual(["Architecture", "Backend", "Platform"]);
  });

  it("assigns correct variants to added, removed, and default teams", () => {
    render(
      <Teams
        teams={["Platform", "Architecture"]}
        addedTeams={["Platform"]}
        removedTeams={["Backend"]}
      />,
    );

    const tags = screen.getAllByTestId("p-tag");

    expect(tags[0]).toHaveAttribute("data-variant", "warning");
    expect(tags[1]).toHaveAttribute("data-variant", "error");
    expect(tags[2]).toHaveAttribute("data-variant", "success");
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
