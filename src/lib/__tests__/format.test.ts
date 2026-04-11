import {
  format,
  formatRelease,
  formatReleaseCompact,
  formatReleaseShort,
  formatTitle,
} from "@/lib/format";

vi.mock("@/lib/data", () => ({
  getAppName: () => "Test Radar",
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
    expect(formatTitle("Quadrant")).toBe("Quadrant | Test Radar");
  });

  it("joins multiple parts", () => {
    expect(formatTitle("Item", "Quadrant")).toBe(
      "Item | Quadrant | Test Radar",
    );
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
