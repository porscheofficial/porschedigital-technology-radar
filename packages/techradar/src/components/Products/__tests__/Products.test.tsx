import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { Product } from "../Products";

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
      {iconSlot}
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

describe("Product", () => {
  it("renders a themed product chip with the stack icon", () => {
    render(<Product product="v2" />);

    expect(screen.getByTestId("chip")).toHaveTextContent("v2");
    expect(screen.getByTestId("chip")).toHaveAttribute("data-kind", "product");
    expect(screen.getByTestId("p-icon")).toHaveAttribute("data-name", "stack");
  });

  it("passes the compact prop", () => {
    render(<Product product="v2" compact />);

    expect(screen.getByTestId("chip")).toHaveAttribute("data-compact", "true");
  });

  it("renders as a plain span when no href is provided", () => {
    render(<Product product="v2" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders as a link when an href is provided", () => {
    render(<Product product="v2" href="/?products=v2" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/?products=v2");
    expect(link).toHaveClass("productLink");
    expect(link).toContainElement(screen.getByTestId("chip"));
  });
});
