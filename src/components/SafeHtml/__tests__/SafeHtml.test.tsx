import { render, screen } from "@testing-library/react";
import type { JSX } from "react";
import { SafeHtml } from "../SafeHtml";

function BrokenTag(): JSX.Element {
  throw new Error("Broken render");
}

describe("SafeHtml", () => {
  it("renders HTML content via dangerouslySetInnerHTML", () => {
    render(<SafeHtml html="<strong>Safe content</strong>" />);

    expect(screen.getByText("Safe content").tagName).toBe("STRONG");
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
