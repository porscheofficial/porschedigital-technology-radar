import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
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
});
