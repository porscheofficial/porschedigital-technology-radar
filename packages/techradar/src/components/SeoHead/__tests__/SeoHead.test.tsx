import { render } from "@testing-library/react";
import { SeoHead } from "@/components/SeoHead/SeoHead";

vi.mock("next/head", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/config", () => ({
  default: { labels: { title: "Test Radar" } },
}));

vi.mock("@/lib/data", () => ({
  getAbsoluteUrl: vi.fn((path: string) => `https://radar.example.com${path}`),
}));

describe("SeoHead", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("renders the required SEO, Open Graph, and Twitter tags", () => {
    render(
      <SeoHead
        title="React"
        description="React summary"
        path="/languages-and-frameworks/react/"
        image="/og/languages-and-frameworks/react.png"
        type="article"
      />,
      { container: document.head },
    );

    expect(document.querySelector("title")?.textContent).toBe(
      "React | Test Radar",
    );
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe("React summary");
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe("https://radar.example.com/languages-and-frameworks/react/");
    expect(
      document
        .querySelector('meta[property="og:type"]')
        ?.getAttribute("content"),
    ).toBe("article");
    expect(
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content"),
    ).toBe("React | Test Radar");
    expect(
      document
        .querySelector('meta[property="og:url"]')
        ?.getAttribute("content"),
    ).toBe("https://radar.example.com/languages-and-frameworks/react/");
    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).toBe("https://radar.example.com/og/languages-and-frameworks/react.png");
    expect(
      document
        .querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content"),
    ).toBe("Test Radar");
    expect(
      document
        .querySelector('meta[name="twitter:card"]')
        ?.getAttribute("content"),
    ).toBe("summary_large_image");
    expect(
      document
        .querySelector('meta[name="twitter:image"]')
        ?.getAttribute("content"),
    ).toBe("https://radar.example.com/og/languages-and-frameworks/react.png");
  });

  it("uses the default image and preserves absolute image URLs", () => {
    render(
      <>
        <SeoHead title="Home" description={"x".repeat(260)} path="/" />
        <SeoHead
          title="Docs"
          description="Absolute image"
          path="/docs/"
          image="https://cdn.example.com/card.png"
        />
      </>,
      { container: document.head },
    );

    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).toBe("https://radar.example.com/og/default.png");
    expect(
      document
        .querySelectorAll('meta[name="twitter:image"]')[1]
        ?.getAttribute("content"),
    ).toBe("https://cdn.example.com/card.png");
    expect(
      document
        .querySelectorAll('meta[name="description"]')[0]
        ?.getAttribute("content")
        ?.endsWith("…"),
    ).toBe(true);
  });
});
