import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { getLabel, getReleases, getToggle } from "@/lib/data";
import { useTheme } from "@/lib/ThemeContext";
import { Layout } from "../Layout";

vi.mock("@/lib/data", () => ({
  getLabel: vi.fn(),
  getReleases: vi.fn(),
  getToggle: vi.fn(),
}));

vi.mock("@/lib/ThemeContext", () => ({
  useTheme: vi.fn(),
}));

vi.mock("@/components/Footer/Footer", () => ({
  Footer: () => <div data-testid="footer-stub" />,
}));

vi.mock("@/components/SpotlightSearch/SpotlightSearch", () => ({
  SpotlightSearch: () => <div data-testid="spotlight-stub" />,
}));

vi.mock("@/components/ThemeToggle/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle-stub" />,
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PCrest: ({ href }: { href?: string }) => (
    <span data-testid="p-crest" data-href={href} />
  ),
  PIcon: ({ name }: { name?: string }) => (
    <span data-testid={`p-icon-${name}`} />
  ),
  PLinkPure: ({ children, href }: { children?: ReactNode; href?: string }) => (
    <a data-testid="p-link-pure" href={href}>
      {children}
    </a>
  ),
}));

const mockGetLabel = getLabel as ReturnType<typeof vi.fn>;
const mockGetReleases = getReleases as ReturnType<typeof vi.fn>;
const mockGetToggle = getToggle as ReturnType<typeof vi.fn>;
const mockUseTheme = useTheme as ReturnType<typeof vi.fn>;

function makeTheme(headerLogo?: string) {
  return {
    activeTheme: {
      id: "test",
      label: "Test",
      supports: ["dark"],
      default: "dark" as const,
    },
    mode: "dark" as const,
    theme: {
      id: "test",
      label: "Test",
      supports: ["dark"],
      default: "dark" as const,
      cssVariables: {} as Record<string, string>,
      radar: { segments: [], rings: [] },
      assetsResolved: { headerLogo },
    },
    themes: [],
    setActiveTheme: vi.fn(),
    setMode: vi.fn(),
  };
}

describe("Layout (logo precedence)", () => {
  beforeEach(() => {
    mockGetLabel.mockReturnValue("Tech Radar");
    mockGetReleases.mockReturnValue([]);
    mockGetToggle.mockReturnValue(false);
    mockUseTheme.mockReturnValue(makeTheme(undefined));
  });

  it("renders PCrest when the active theme has no headerLogo", () => {
    render(
      <Layout>
        <div />
      </Layout>,
    );

    expect(screen.getByTestId("p-crest")).toBeInTheDocument();
  });

  it("renders the theme header logo when assetsResolved.headerLogo is set", () => {
    mockUseTheme.mockReturnValue(makeTheme("/themes/dark/logo-header.svg"));

    const { container } = render(
      <Layout>
        <div />
      </Layout>,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("/themes/dark/logo-header.svg");
  });

  it("renders the header theme toggle slot", () => {
    render(
      <Layout>
        <div />
      </Layout>,
    );

    expect(screen.getByTestId("theme-toggle-stub")).toBeInTheDocument();
  });

  it("renders the changelog version label as a boxed history button", () => {
    mockGetReleases.mockReturnValue(["2025-01-15"]);

    render(
      <Layout>
        <div />
      </Layout>,
    );

    const link = screen.getByRole("link", { name: /Changelog \(Jan 2025\)/ });
    expect(link).toHaveAttribute("href", "/changelog");
    expect(link.querySelector("[data-testid='p-icon-history']")).not.toBeNull();
    expect(link.textContent).toMatch(/Jan 2025/);
  });
});
