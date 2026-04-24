const mockData = vi.hoisted(() => ({
  getAbsoluteUrl: vi.fn((path = "") => `https://example.com${path}`),
  getItems: vi.fn(() => [
    { id: "react", segment: "languages-and-frameworks" },
    { id: "kubernetes", segment: "platforms-and-operations" },
  ]),
  getSegments: vi.fn(() => [
    { id: "languages-and-frameworks" },
    { id: "platforms-and-operations" },
  ]),
}));

vi.mock("@/lib/data", () => ({
  getAbsoluteUrl: mockData.getAbsoluteUrl,
  getItems: mockData.getItems,
  getSegments: mockData.getSegments,
}));

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an array", () => {
    const result = sitemap();
    expect(Array.isArray(result)).toBe(true);
  });

  it("includes the homepage with priority 1", () => {
    const result = sitemap();
    const homepage = result.find(
      (entry) => entry.url === "https://example.com",
    );
    expect(homepage).toBeDefined();
    expect(homepage?.priority).toBe(1);
  });

  it("includes the about page with priority 0.9", () => {
    const result = sitemap();
    const about = result.find((entry) =>
      entry.url?.includes("help-and-about-tech-radar"),
    );
    expect(about).toBeDefined();
    expect(about?.priority).toBe(0.9);
  });

  it("includes entries for each segment with priority 0.8", () => {
    const result = sitemap();
    const segmentEntries = result.filter((entry) => entry.priority === 0.8);
    expect(segmentEntries).toHaveLength(2);
    expect(segmentEntries[0].url).toBe(
      "https://example.com/languages-and-frameworks/",
    );
    expect(segmentEntries[1].url).toBe(
      "https://example.com/platforms-and-operations/",
    );
  });

  it("includes entries for each item with priority 0.5", () => {
    const result = sitemap();
    const itemEntries = result.filter((entry) => entry.priority === 0.5);
    expect(itemEntries).toHaveLength(2);
    expect(itemEntries[0].url).toBe(
      "https://example.com/languages-and-frameworks/react/",
    );
    expect(itemEntries[1].url).toBe(
      "https://example.com/platforms-and-operations/kubernetes/",
    );
  });

  it("has lastModified as a Date on all entries", () => {
    const result = sitemap();
    for (const entry of result) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });

  it("total entries = 2 static + segments + items", () => {
    const result = sitemap();
    expect(result).toHaveLength(6);
  });

  it("returns empty segment/item sections when data is empty", () => {
    mockData.getSegments.mockReturnValue([]);
    mockData.getItems.mockReturnValue([]);

    const result = sitemap();
    expect(result).toHaveLength(2);
  });
});
