import { render, screen } from "@testing-library/react";
import type { ComponentProps, JSX } from "react";
import { SafeHtml } from "../SafeHtml";

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PLinkPure: ({ children, ...props }: ComponentProps<"a">) => (
    <a data-testid="p-link-pure" {...props}>
      {children}
    </a>
  ),
}));

function BrokenTag(): JSX.Element {
  throw new Error("Broken render");
}

describe("SafeHtml", () => {
  it("renders parsed HTML content as React nodes", () => {
    render(<SafeHtml html="<strong>Safe content</strong>" />);

    expect(screen.getByText("Safe content").tagName).toBe("STRONG");
  });

  it("rewrites internal anchors to PLinkPure with no icon", () => {
    render(<SafeHtml html='<p>see <a href="/foo">foo</a></p>' />);

    const link = screen.getByTestId("p-link-pure");
    expect(link.getAttribute("href")).toBe("/foo");
    expect(link.getAttribute("icon")).toBe("none");
    expect(link.getAttribute("target")).toBeNull();
    expect(link.textContent).toBe("foo");
  });

  it("rewrites external anchors (target=_blank) to PLinkPure with external icon", () => {
    render(
      <SafeHtml html='<a href="https://x.test" target="_blank" rel="noopener">x</a>' />,
    );

    const link = screen.getByTestId("p-link-pure");
    expect(link.getAttribute("href")).toBe("https://x.test");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener");
    expect(link.getAttribute("icon")).toBe("external");
  });

  it("preserves nested formatting inside link labels", () => {
    render(<SafeHtml html='<a href="/x"><strong>bold</strong> text</a>' />);

    const link = screen.getByTestId("p-link-pure");
    expect(link.querySelector("strong")?.textContent).toBe("bold");
    expect(link.textContent).toBe("bold text");
  });

  it("leaves anchors without href untouched", () => {
    const { container } = render(<SafeHtml html="<a>orphan</a>" />);

    expect(screen.queryByTestId("p-link-pure")).toBeNull();
    expect(container.querySelector("a")?.textContent).toBe("orphan");
  });

  it("uses a custom element tag", () => {
    const { container } = render(
      <SafeHtml as="section" html="<p>Section body</p>" />,
    );

    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("applies className", () => {
    const { container } = render(
      <SafeHtml html="content" className="custom-html" />,
    );

    expect(container.firstChild).toHaveClass("custom-html");
  });

  it("renders fallback on error", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <SafeHtml
        as={BrokenTag}
        html="<span>Ignored</span>"
        fallback={<div>Fallback content</div>}
      />,
    );

    expect(screen.getByText("Fallback content")).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("renders null on error with no fallback", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { container } = render(
      <SafeHtml as={BrokenTag} html="<span>Ignored</span>" />,
    );

    expect(container).toBeEmptyDOMElement();
    consoleErrorSpy.mockRestore();
  });

  it("logs the error to console.error", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <SafeHtml
        as={BrokenTag}
        html="<span>Ignored</span>"
        fallback={<div>Fallback content</div>}
      />,
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "SafeHtml render error:",
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );

    consoleErrorSpy.mockRestore();
  });
});
