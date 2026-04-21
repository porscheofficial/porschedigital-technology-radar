import { assetUrl, cn } from "@/lib/utils";

vi.mock("../../../next.config.js", () => ({
  default: { basePath: "" },
}));

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

// Regression: assetUrl must prepend basePath in production builds. This is
// the helper used for raw <a>, <img>, and PDS components (which are NOT
// Next.js-aware). next/link must NOT wrap its href with assetUrl(), or the
// basePath gets doubled (see eslint.config.mjs forbidding rule).
describe("assetUrl with basePath", () => {
  it("prepends basePath to absolute paths and trims trailing slash", async () => {
    vi.resetModules();
    vi.doMock("../../../next.config.js", () => ({
      default: { basePath: "/porschedigital-technology-radar" },
    }));
    const { assetUrl: scopedAssetUrl } = await import("@/lib/utils");
    expect(scopedAssetUrl("/languages-and-frameworks/vue")).toBe(
      "/porschedigital-technology-radar/languages-and-frameworks/vue",
    );
    expect(scopedAssetUrl("images/logo.png")).toBe(
      "/porschedigital-technology-radar/images/logo.png",
    );
    expect(scopedAssetUrl("https://example.com/img.png")).toBe(
      "https://example.com/img.png",
    );
    vi.doUnmock("../../../next.config.js");
    vi.resetModules();
  });
});
