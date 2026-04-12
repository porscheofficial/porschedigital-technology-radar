import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { Quadrant } from "@/lib/types";
import { MobileQuadrantNav } from "../MobileQuadrantNav";

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PLinkTile: ({
    href,
    label,
    description,
    children,
    ...rest
  }: ComponentProps<"a"> & {
    href?: string;
    label?: string;
    description?: string;
  }) => (
    <a href={href} data-label={label} data-description={description} {...rest}>
      {children}
    </a>
  ),
}));

describe("MobileQuadrantNav", () => {
  const quadrants: Quadrant[] = [
    {
      id: "languages-and-frameworks",
      title: "Languages & Frameworks",
      description: "Programming stack",
      color: "#4A9E7E",
      position: 1,
    },
    {
      id: "methods-and-patterns",
      title: "Methods & Patterns",
      description: "How we work",
      color: "#5B8DB8",
      position: 2,
    },
    {
      id: "platforms-and-operations",
      title: "Platforms & Operations",
      description: "Ops stack",
      color: "#C4A85E",
      position: 3,
    },
    {
      id: "tools",
      title: "Tools",
      description: "Developer tools",
      color: "#B85B5B",
      position: 4,
    },
  ];

  it("renders a nav element with accessible label", () => {
    render(<MobileQuadrantNav quadrants={quadrants} />);

    expect(
      screen.getByRole("navigation", { name: "Quadrants" }),
    ).toBeInTheDocument();
  });

  it("renders a link tile for each quadrant", () => {
    render(<MobileQuadrantNav quadrants={quadrants} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });

  it("links to the correct quadrant pages", () => {
    render(<MobileQuadrantNav quadrants={quadrants} />);

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/languages-and-frameworks");
    expect(links[1]).toHaveAttribute("href", "/methods-and-patterns");
    expect(links[2]).toHaveAttribute("href", "/platforms-and-operations");
    expect(links[3]).toHaveAttribute("href", "/tools");
  });

  it("passes quadrant title as description", () => {
    render(<MobileQuadrantNav quadrants={quadrants} />);

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute(
      "data-description",
      "Languages & Frameworks",
    );
    expect(links[3]).toHaveAttribute("data-description", "Tools");
  });

  it("renders a color swatch with the quadrant color", () => {
    const { container } = render(
      <MobileQuadrantNav quadrants={[quadrants[0]]} />,
    );

    const swatch = container.querySelector("[style]");
    expect(swatch).toHaveStyle({ backgroundColor: "#4A9E7E" });
  });

  it("renders nothing when quadrants array is empty", () => {
    render(<MobileQuadrantNav quadrants={[]} />);

    const nav = screen.getByRole("navigation", { name: "Quadrants" });
    expect(nav.children).toHaveLength(0);
  });
});
