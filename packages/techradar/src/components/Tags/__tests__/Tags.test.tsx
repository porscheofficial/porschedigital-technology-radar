import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { Tag } from "../Tags";

interface MockChipProps {
  kind?: string;
  children?: ReactNode;
  iconSlot?: ReactNode;
  compact?: boolean;
}

vi.mock("@/components/Chip/Chip", () => ({
  Chip: ({ kind, children, iconSlot, compact }: MockChipProps) => (
    <span
      data-testid="chip"
      data-kind={kind}
      data-compact={compact ? "true" : "false"}
    >
      <span data-testid="chip-icon-slot">{iconSlot}</span>
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

describe("Tag", () => {
  it("renders the tag text inside a Chip", () => {
    render(<Tag tag="frontend" />);

    expect(screen.getByTestId("chip")).toHaveTextContent("frontend");
  });

  it("passes the compact prop", () => {
    render(<Tag tag="frontend" compact />);

    expect(screen.getByTestId("chip")).toHaveAttribute("data-compact", "true");
  });

  // Regression: tags must use kind="tag" so theme.json `chips.tag` colors apply
  // (theme-configurable replacement for the old PDS info-frosted variant).
  it("uses the chip kind=tag so themed tag colors apply", () => {
    render(<Tag tag="frontend" />);

    expect(screen.getByTestId("chip")).toHaveAttribute("data-kind", "tag");
  });

  it("uses the bookmark icon", () => {
    render(<Tag tag="frontend" />);

    expect(screen.getByTestId("p-icon")).toHaveAttribute(
      "data-name",
      "bookmark",
    );
  });

  it("renders as a plain span (not a link) when no href is provided", () => {
    render(<Tag tag="frontend" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders as a Link with the given href when href is provided", () => {
    render(<Tag tag="frontend" href="/?tags=frontend" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/?tags=frontend");
    expect(link).toContainElement(screen.getByTestId("chip"));
  });
});
