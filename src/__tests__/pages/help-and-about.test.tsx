import { render, screen } from "@testing-library/react";
import HelpAndAbout from "@/pages/help-and-about-tech-radar";

const mockState = vi.hoisted(() => ({
  getAppName: vi.fn(),
  safeHtmlProps: vi.fn(),
}));

vi.mock("next/head", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/lib/config", () => ({
  default: { labels: { title: "Test Radar" } },
}));

vi.mock("@/lib/data", () => ({
  getAppName: mockState.getAppName,
}));

vi.mock("@/components/SafeHtml/SafeHtml", () => ({
  SafeHtml: ({ html }: any) => {
    mockState.safeHtmlProps({ html });
    return <div data-testid="safe-html">{html}</div>;
  },
}));

vi.mock("../../../data/about.json", () => ({
  default: {
    body: "<p>About the radar</p>",
  },
}));

describe("Help and About page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.getAppName.mockReturnValue("Test Radar");
  });

  it("renders the page title", () => {
    render(<HelpAndAbout />);

    expect(document.querySelector("title")?.textContent).toBe(
      "Help and About | Test Radar",
    );
  });

  it("renders the SafeHtml component", () => {
    render(<HelpAndAbout />);

    expect(screen.getByTestId("safe-html")).toBeInTheDocument();
  });

  it("passes about.body to SafeHtml", () => {
    render(<HelpAndAbout />);

    expect(mockState.safeHtmlProps).toHaveBeenCalledWith({
      html: "<p>About the radar</p>",
    });
  });

  it("renders the about body content", () => {
    render(<HelpAndAbout />);

    expect(screen.getByText("<p>About the radar</p>")).toBeInTheDocument();
  });
});
