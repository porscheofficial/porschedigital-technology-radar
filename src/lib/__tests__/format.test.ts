import {
  deriveSummary,
  format,
  formatLinkLabel,
  formatRelease,
  formatReleaseCompact,
  formatReleaseShort,
  formatTitle,
  matchesAbbreviation,
  stripHtml,
  truncate,
} from "@/lib/format";
import { Flag } from "@/lib/types";

vi.mock("@/lib/config", () => ({
  default: { labels: { title: "Test Radar" } },
}));

describe("format", () => {
  it("replaces placeholders with context values", () => {
    expect(format("Hello {name}!", { name: "World" })).toBe("Hello World!");
  });

  it("replaces multiple placeholders", () => {
    expect(format("{a} and {b}", { a: "X", b: "Y" })).toBe("X and Y");
  });

  it("leaves unmatched placeholders intact", () => {
    expect(format("{known} {unknown}", { known: "yes" })).toBe("yes {unknown}");
  });

  it("handles empty context", () => {
    expect(format("{a}", {})).toBe("{a}");
  });

  it("handles text without placeholders", () => {
    expect(format("no placeholders", { a: "1" })).toBe("no placeholders");
  });
});

describe("formatTitle", () => {
  it("joins parts with pipe separator and appends app name", () => {
    expect(formatTitle("Segment")).toBe("Segment | Test Radar");
  });

  it("joins multiple parts", () => {
    expect(formatTitle("Item", "Segment")).toBe("Item | Segment | Test Radar");
  });
});

describe("formatRelease", () => {
  it("formats as long month + full year", () => {
    const result = formatRelease("2024-03");
    expect(result).toContain("March");
    expect(result).toContain("2024");
  });

  it("handles full date strings", () => {
    const result = formatRelease("2024-01-15");
    expect(result).toContain("January");
    expect(result).toContain("2024");
  });
});

describe("formatReleaseShort", () => {
  it("formats as short month + full year", () => {
    const result = formatReleaseShort("2024-03");
    expect(result).toContain("Mar");
    expect(result).toContain("2024");
  });
});

describe("formatReleaseCompact", () => {
  it("formats as short month + 2-digit year", () => {
    const result = formatReleaseCompact("2024-03");
    expect(result).toContain("Mar");
    expect(result).toContain("24");
    expect(result).not.toContain("2024");
  });
});

describe("timezone safety", () => {
  it("does not shift dates near midnight boundaries", () => {
    const result = formatRelease("2024-01-01");
    expect(result).toContain("January");
    expect(result).toContain("2024");
  });
});

describe("stripHtml", () => {
  it("removes simple tags", () => {
    expect(stripHtml("<p>hello</p>")).toBe("hello");
  });

  it("removes nested and attributed tags", () => {
    expect(stripHtml('<div class="x"><strong>bold</strong> text</div>')).toBe(
      "bold text",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(stripHtml("  <p>spaced</p>  ")).toBe("spaced");
  });

  it("returns empty string for tag-only input", () => {
    expect(stripHtml("<br/>")).toBe("");
  });
});

describe("truncate", () => {
  it("returns the original text when under the limit", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("returns the original text when exactly at the limit", () => {
    expect(truncate("12345", 5)).toBe("12345");
  });

  it("appends a U+2026 ellipsis when over the limit", () => {
    expect(truncate("123456", 5)).toBe("12345…");
  });
});

describe("deriveSummary", () => {
  it("prefers an explicit summary when provided", () => {
    expect(
      deriveSummary({
        id: "react",
        title: "React",
        summary: "Custom summary",
        body: "<p>Ignored</p>",
        featured: true,
        ring: "adopt",
        segment: "languages-and-frameworks",
        flag: Flag.Default,
        release: "2024-01",
        position: [0, 0],
      }),
    ).toBe("Custom summary");
  });

  it("derives and truncates a summary from stripped html at a word boundary", () => {
    const summary = deriveSummary({
      id: "react",
      title: "React",
      body: "<p>React is a UI library used for building interfaces with reusable components and predictable composition patterns across many frontend applications in large organisations with shared design systems and long-lived products.</p>",
      featured: true,
      ring: "adopt",
      segment: "languages-and-frameworks",
      flag: Flag.Default,
      release: "2024-01",
      position: [0, 0],
    });

    expect(summary.length).toBeLessThanOrEqual(161);
    expect(summary).toContain("React is a UI library");
    expect(summary.endsWith("…")).toBe(true);
    expect(summary).not.toContain("<p>");
  });
});

describe("formatLinkLabel", () => {
  it("uses the link name when provided", () => {
    expect(
      formatLinkLabel({ name: "Docs", url: "https://example.com/docs" }),
    ).toBe("Docs");
  });

  it("falls back to hostname for a bare URL", () => {
    expect(formatLinkLabel({ url: "https://example.com" })).toBe("example.com");
  });

  it("includes a non-root path with the hostname", () => {
    expect(formatLinkLabel({ url: "https://example.com/some/path" })).toBe(
      "example.com/some/path",
    );
  });

  it("falls back to the raw url for invalid URLs", () => {
    expect(formatLinkLabel({ url: "not a url" })).toBe("not a url");
  });
});

describe("matchesAbbreviation", () => {
  it("matches a full initials sequence", () => {
    expect(matchesAbbreviation("React Testing Library", "rtl")).toBe(true);
  });

  it("matches a prefix of initials", () => {
    expect(matchesAbbreviation("React Testing Library", "rt")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesAbbreviation("react testing library", "RTL")).toBe(true);
  });

  it("splits on hyphens, slashes, ampersands, and dots", () => {
    expect(matchesAbbreviation("CI/CD", "cc")).toBe(true);
    expect(matchesAbbreviation("rock-paper-scissors", "rps")).toBe(true);
  });

  it("returns false when initials don't match", () => {
    expect(matchesAbbreviation("React Testing Library", "xyz")).toBe(false);
  });
});
