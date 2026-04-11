import { render, screen } from "@testing-library/react";
import Custom404 from "@/pages/404";

const mockState = vi.hoisted(() => ({
  getAppName: vi.fn(),
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

vi.mock("@/lib/data", () => ({
  getAppName: mockState.getAppName,
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PHeading: ({ children, tag = "h2", ...props }: any) => {
    const Tag = tag;
    return <Tag {...props}>{children}</Tag>;
  },
  PText: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));

vi.mock("@/components/Icons/Search", () => ({
  default: () => <div data-testid="search-icon" />,
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

  it("renders the formatted page title", () => {
    render(<Custom404 />);

    expect(document.querySelector("title")?.textContent).toBe(
      "404 - Page Not Found | Test Radar",
    );
  });

  it("renders the search illustration", () => {
    render(<Custom404 />);

    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });
});
