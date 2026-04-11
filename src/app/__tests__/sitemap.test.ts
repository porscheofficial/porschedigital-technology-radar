const mockData = vi.hoisted(() => ({
  getAbsoluteUrl: vi.fn((path = "") => `https://example.com${path}`),
  getItems: vi.fn(() => [
    { id: "react", quadrant: "languages-and-frameworks" },
    { id: "kubernetes", quadrant: "platforms-and-operations" },
  ]),
  getQuadrants: vi.fn(() => [
    { id: "languages-and-frameworks" },
    { id: "platforms-and-operations" },
  ]),
}));

vi.mock("@/lib/data", () => ({
  getAbsoluteUrl: mockData.getAbsoluteUrl,
  getItems: mockData.getItems,
  getQuadrants: mockData.getQuadrants,
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

  it("includes entries for each quadrant with priority 0.8", () => {
    const result = sitemap();
    const quadrantEntries = result.filter((entry) => entry.priority === 0.8);
    expect(quadrantEntries).toHaveLength(2);
    expect(quadrantEntries[0].url).toBe(
      "https://example.com/languages-and-frameworks/",
    );
    expect(quadrantEntries[1].url).toBe(
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

  it("total entries = 2 static + quadrants + items", () => {
    const result = sitemap();
    // 1 homepage + 1 about + 2 quadrants + 2 items = 6
    expect(result).toHaveLength(6);
  });

  it("returns empty quadrant/item sections when data is empty", () => {
    mockData.getQuadrants.mockReturnValue([]);
    mockData.getItems.mockReturnValue([]);

    const result = sitemap();
    // Only homepage + about
    expect(result).toHaveLength(2);
  });
});
