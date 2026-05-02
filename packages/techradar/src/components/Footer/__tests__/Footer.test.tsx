import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  getFooterLogoUrl,
  getImprintUrl,
  getLabel,
  getSocialLinks,
} from "@/lib/data";
import { Footer } from "../Footer";

interface MockLinkProps {
  children?: ReactNode;
  href?: string;
  icon?: string;
  iconSource?: string;
  hideLabel?: boolean;
  size?: string;
  target?: string;
  className?: string;
  underline?: boolean;
}

interface MockTextProps {
  children?: ReactNode;
  size?: string;
  className?: string;
}

interface MockWordmarkProps {
  className?: string;
}

vi.mock("@/lib/data", () => ({
  getSocialLinks: vi.fn(),
  getImprintUrl: vi.fn(),
  getFooterLogoUrl: vi.fn(),
  getLabel: vi.fn(),
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PTag: ({ children, ...props }: { children?: ReactNode }) => (
    <span data-testid="p-tag" {...props}>
      {children}
    </span>
  ),
  PLinkPure: ({
    children,
    href,
    icon,
    iconSource,
    size,
    target,
    className,
    underline,
    hideLabel,
  }: MockLinkProps) => (
    <a
      data-testid="p-link-pure"
      href={href}
      data-icon={icon}
      data-icon-source={iconSource}
      data-size={size}
      data-target={target}
      data-class={className}
      data-underline={underline ? "true" : "false"}
      data-hide-label={hideLabel ? "true" : "false"}
    >
      {children}
    </a>
  ),
  PText: ({ children, size, className }: MockTextProps) => (
    <span data-testid="p-text" data-size={size} data-class={className}>
      {children}
    </span>
  ),
  PWordmark: ({ className }: MockWordmarkProps) => (
    <span data-testid="p-wordmark" data-class={className} />
  ),
  PIcon: ({ name, ...props }: { name: string }) => (
    <span data-testid={`p-icon-${name}`} {...props} />
  ),
}));

const mockGetSocialLinks = getSocialLinks as ReturnType<typeof vi.fn>;
const mockGetImprintUrl = getImprintUrl as ReturnType<typeof vi.fn>;
const mockGetFooterLogoUrl = getFooterLogoUrl as ReturnType<typeof vi.fn>;
const mockGetLabel = getLabel as ReturnType<typeof vi.fn>;

describe("Footer", () => {
  beforeEach(() => {
    mockGetSocialLinks.mockReset();
    mockGetImprintUrl.mockReset();
    mockGetFooterLogoUrl.mockReset();
    mockGetLabel.mockReset();

    mockGetSocialLinks.mockReturnValue([]);
    mockGetImprintUrl.mockReturnValue("");
    mockGetFooterLogoUrl.mockReturnValue("");
    mockGetLabel.mockImplementation((key: string) => {
      if (key === "footer") return "Footer text";
      if (key === "imprint") return "Legal Information";
      return "";
    });
  });

  it("renders social links with mapped PDS icons", () => {
    mockGetSocialLinks.mockReturnValue([
      { href: "https://x.example.com", icon: "x" },
      { href: "https://linkedin.example.com", icon: "linkedin" },
    ]);

    render(<Footer />);

    const links = screen.getAllByTestId("p-link-pure");
    expect(links[0]).toHaveAttribute("data-icon", "logo-x");
    expect(links[1]).toHaveAttribute("data-icon", "logo-linkedin");
  });

  it("renders custom SVG icons for github", () => {
    mockGetSocialLinks.mockReturnValue([
      { href: "https://github.com/example", icon: "github" },
    ]);

    render(<Footer />);

    expect(screen.getByTestId("p-link-pure")).toHaveAttribute(
      "data-icon-source",
      expect.stringContaining("data:image/svg+xml"),
    );
  });

  it("hides the social section when there are no links", () => {
    render(<Footer />);

    expect(screen.queryByTestId("p-link-pure")).not.toBeInTheDocument();
  });

  it("renders the footer logo image when a URL is provided", () => {
    mockGetFooterLogoUrl.mockReturnValue("/logo.svg");

    const { container } = render(<Footer />);

    expect(container.querySelector("img")).toHaveAttribute("src", "/logo.svg");
  });

  it("renders the PWordmark when no logo URL is provided", () => {
    render(<Footer />);

    expect(screen.getByTestId("p-wordmark")).toBeInTheDocument();
  });

  it("renders footer text", () => {
    render(<Footer />);

    expect(screen.getByTestId("p-text")).toHaveTextContent("Footer text");
  });

  it("renders the imprint link", () => {
    mockGetImprintUrl.mockReturnValue("https://example.com/imprint");

    render(<Footer />);

    expect(
      screen.getByRole("link", { name: "Legal Information" }),
    ).toHaveAttribute("href", "https://example.com/imprint");
  });

  it("hides imprint when no URL is available", () => {
    render(<Footer />);

    expect(
      screen.queryByRole("link", { name: "Legal Information" }),
    ).not.toBeInTheDocument();
  });
});
