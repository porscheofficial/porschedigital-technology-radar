import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
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

describe("Tag", () => {
  it("renders the tag text inside PTag", () => {
    render(<Tag tag="frontend" />);

    expect(screen.getByTestId("p-tag")).toHaveTextContent("frontend");
  });

  it("passes the compact prop", () => {
    render(<Tag tag="frontend" compact />);

    expect(screen.getByTestId("p-tag")).toHaveAttribute("data-compact", "true");
  });
});
