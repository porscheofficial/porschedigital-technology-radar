import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { useTheme } from "@/lib/ThemeContext";
import type { Segment } from "@/lib/types";
import { MobileSegmentNav } from "../MobileSegmentNav";

vi.mock("@/lib/ThemeContext", () => ({
  useTheme: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  assetUrl: (path: string) => `/base${path}`,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

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
    <a
      href={href}
      data-testid="p-link-tile"
      data-label={label}
      data-description={description}
      {...rest}
    >
      {children}
    </a>
  ),
  PText: ({ children, ...rest }: ComponentProps<"span">) => (
    <span data-testid="p-text" {...rest}>
      {children}
    </span>
  ),
}));

const mockUseTheme = useTheme as ReturnType<typeof vi.fn>;

function makeTheme() {
  return {
    activeTheme: {
      id: "porsche",
      label: "Porsche",
      supports: ["dark"],
      default: "dark" as const,
    },
    mode: "dark" as const,
    theme: {
      id: "porsche",
      label: "Porsche",
      supports: ["dark"],
      default: "dark" as const,
      cssVariables: {
        foreground: "#FBFCFF",
        background: "#0E0E12",
        highlight: "#FBFCFF",
        content: "#AFB0B3",
        text: "#88898C",
        link: "#FBFCFF",
        border: "#404044",
        tag: "#404044",
        surface: "#212225",
        footer: "#212225",
        shading: "rgba(38, 38, 41, 0.67)",
        frosted: "rgba(64, 64, 68, 0.35)",
      },
      radar: {
        segments: ["#4A9E7E", "#5B8DB8", "#C4A85E", "#B85B5B"],
        rings: ["#00aa88", "#0088aa", "#aa8800", "#888888"],
      },
      assetsResolved: {},
    },
    themes: [],
    setActiveTheme: vi.fn(),
    setMode: vi.fn(),
  };
}

describe("MobileSegmentNav", () => {
  const segments: Segment[] = [
    {
      id: "languages-and-frameworks",
      title: "Languages & Frameworks",
      description: "Programming stack",
      position: 1,
    },
    {
      id: "methods-and-patterns",
      title: "Methods & Patterns",
      description: "How we work",
      position: 2,
    },
    {
      id: "platforms-and-operations",
      title: "Platforms & Operations",
      description: "Ops stack",
      position: 3,
    },
    {
      id: "tools",
      title: "Tools",
      description: "Developer tools",
      position: 4,
    },
  ];

  beforeEach(() => {
    mockUseTheme.mockReset();
    mockUseTheme.mockReturnValue(makeTheme());
  });

  it("renders a nav element with accessible label", () => {
    render(<MobileSegmentNav segments={segments} />);

    expect(
      screen.getByRole("navigation", { name: "Segments" }),
    ).toBeInTheDocument();
  });

  it("renders a link tile for each segment", () => {
    render(<MobileSegmentNav segments={segments} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });

  it("links to the correct segment pages", () => {
    render(<MobileSegmentNav segments={segments} />);

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/base/languages-and-frameworks");
    expect(links[1]).toHaveAttribute("href", "/base/methods-and-patterns");
    expect(links[2]).toHaveAttribute("href", "/base/platforms-and-operations");
    expect(links[3]).toHaveAttribute("href", "/base/tools");
  });

  it("passes segment title as description", () => {
    render(<MobileSegmentNav segments={segments} />);

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute(
      "data-description",
      "Languages & Frameworks",
    );
    expect(links[3]).toHaveAttribute("data-description", "Tools");
  });

  it("renders a color swatch with the segment color", () => {
    const { container } = render(<MobileSegmentNav segments={[segments[0]]} />);

    const swatch = container.querySelector("[style]");
    expect(swatch).toHaveStyle({ backgroundColor: "#4A9E7E" });
  });

  it("renders nothing when segments array is empty", () => {
    render(<MobileSegmentNav segments={[]} />);

    const nav = screen.getByRole("navigation", { name: "Segments" });
    expect(nav.children).toHaveLength(0);
  });
});
