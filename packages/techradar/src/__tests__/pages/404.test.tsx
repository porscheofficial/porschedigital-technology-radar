import { render, screen } from "@testing-library/react";
import Custom404 from "@/pages/404";

const mockState = vi.hoisted(() => ({
  getAppName: vi.fn(),
  seoHeadProps: vi.fn(),
}));

vi.mock("next/head", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/config", () => ({
  default: { labels: { title: "Test Radar" } },
}));

vi.mock("@/lib/data", () => ({
  getAppName: mockState.getAppName,
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PHeading: ({ children, tag = "h2", ...props }: any) => {
    const Tag = tag;
    return (
      <Tag data-testid="p-heading" {...props}>
        {children}
      </Tag>
    );
  },
  PText: ({ children, ...props }: any) => (
    <p data-testid="p-text" {...props}>
      {children}
    </p>
  ),
}));

vi.mock("@/components/Icons/Search", () => ({
  default: () => <div data-testid="search-icon" />,
}));

vi.mock("@/components/SeoHead/SeoHead", () => ({
  SeoHead: (props: any) => {
    mockState.seoHeadProps(props);
    return <div data-testid="seo-head" />;
  },
}));

describe("Custom 404 page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.getAppName.mockReturnValue("Test Radar");
  });

  it("renders the not found heading", () => {
    render(<Custom404 />);

    expect(
      screen.getByRole("heading", { name: "404 - Page Not Found" }),
    ).toBeInTheDocument();
  });

  it("has a link back to the homepage", () => {
    render(<Custom404 />);

    expect(
      screen.getByRole("link", { name: "Return to homepage" }),
    ).toHaveAttribute("href", "/");
  });

  it("passes SEO props", () => {
    render(<Custom404 />);

    expect(mockState.seoHeadProps).toHaveBeenCalledWith({
      title: "Not found",
      description: "The requested technology radar page could not be found.",
      path: "/404/",
    });
  });

  it("renders the search illustration", () => {
    render(<Custom404 />);

    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });
});
