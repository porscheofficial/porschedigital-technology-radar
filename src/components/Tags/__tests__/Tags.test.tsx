import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { Tag } from "../Tags";

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

describe("Tag", () => {
  it("renders the tag text inside PTag", () => {
    render(<Tag tag="frontend" />);

    expect(screen.getByTestId("p-tag")).toHaveTextContent("frontend");
  });

  it("passes the compact prop", () => {
    render(<Tag tag="frontend" compact />);

    expect(screen.getByTestId("p-tag")).toHaveAttribute("data-compact", "true");
  });

  it("renders as a plain span (not a link) when no href is provided", () => {
    render(<Tag tag="frontend" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders as a Link with the given href when href is provided", () => {
    render(<Tag tag="frontend" href="/?tags=frontend" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/?tags=frontend");
    expect(link).toContainElement(screen.getByTestId("p-tag"));
  });
});
