import { assetUrl, cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("handles conditional objects", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

describe("assetUrl", () => {
  it("prepends slash to relative paths", () => {
    expect(assetUrl("images/logo.png")).toBe("/images/logo.png");
  });

  it("keeps absolute paths as-is", () => {
    expect(assetUrl("/images/logo.png")).toBe("/images/logo.png");
  });

  it("returns https URLs unchanged", () => {
    expect(assetUrl("https://example.com/img.png")).toBe(
      "https://example.com/img.png",
    );
  });

  it("returns http URLs unchanged", () => {
    expect(assetUrl("http://example.com/img.png")).toBe(
      "http://example.com/img.png",
    );
  });
});
