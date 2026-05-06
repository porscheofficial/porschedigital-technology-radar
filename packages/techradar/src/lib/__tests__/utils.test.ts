import { assetUrl, cn, readableTextOn } from "@/lib/utils";

vi.mock("@/lib/config", () => ({
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
    vi.doMock("@/lib/config", () => ({
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
    vi.doUnmock("@/lib/config");
    vi.resetModules();
  });
});

// Regression (deploy fix): assetUrl() must read NEXT_PUBLIC_BASE_PATH first,
// because the GitHub Pages deploy sets that env var rather than editing
// data/config.json. Without env precedence, theme background images and other
// raw asset URLs 404 on the deployed sub-path.
describe("assetUrl with NEXT_PUBLIC_BASE_PATH env var", () => {
  const originalEnv = process.env.NEXT_PUBLIC_BASE_PATH;
  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = originalEnv;
    }
    vi.resetModules();
  });

  it("uses NEXT_PUBLIC_BASE_PATH when set, overriding config.basePath", async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/porschedigital-technology-radar";
    vi.resetModules();
    vi.doMock("@/lib/config", () => ({
      default: { basePath: "/something-else" },
    }));
    const { assetUrl: scopedAssetUrl } = await import("@/lib/utils");
    expect(scopedAssetUrl("/themes/porsche/background-dark.jpg")).toBe(
      "/porschedigital-technology-radar/themes/porsche/background-dark.jpg",
    );
    vi.doUnmock("@/lib/config");
  });

  it("treats NEXT_PUBLIC_BASE_PATH='/' as empty so root deploys are unprefixed", async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/";
    vi.resetModules();
    vi.doMock("@/lib/config", () => ({
      default: { basePath: "/should-be-ignored" },
    }));
    const { assetUrl: scopedAssetUrl } = await import("@/lib/utils");
    expect(scopedAssetUrl("/foo")).toBe("/foo");
    vi.doUnmock("@/lib/config");
  });

  it("falls back to config.basePath when NEXT_PUBLIC_BASE_PATH is unset", async () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    vi.resetModules();
    vi.doMock("@/lib/config", () => ({
      default: { basePath: "/from-config" },
    }));
    const { assetUrl: scopedAssetUrl } = await import("@/lib/utils");
    expect(scopedAssetUrl("/foo")).toBe("/from-config/foo");
    vi.doUnmock("@/lib/config");
  });
});

describe("readableTextOn", () => {
  it("returns white ink on dark light-theme segment colors so tooltip text remains legible", () => {
    expect(readableTextOn("#2D7A5C")).toBe("#FFFFFF");
    expect(readableTextOn("#3A6FA0")).toBe("#FFFFFF");
    expect(readableTextOn("#9C7E33")).toBe("#FFFFFF");
    expect(readableTextOn("#9C3A3A")).toBe("#FFFFFF");
  });

  it("returns white ink on saturated dark-theme segments including the lightest amber so theme colors stay paired with white per design intent", () => {
    expect(readableTextOn("#4A9E7E")).toBe("#FFFFFF");
    expect(readableTextOn("#5B8DB8")).toBe("#FFFFFF");
    expect(readableTextOn("#B85B5B")).toBe("#FFFFFF");
    expect(readableTextOn("#C4A85E")).toBe("#FFFFFF");
  });

  it("returns white ink on saturated team accents (regression: orange #FF8A3C must not flip to black)", () => {
    expect(readableTextOn("#C45A00")).toBe("#FFFFFF");
    expect(readableTextOn("#FF8A3C")).toBe("#FFFFFF");
  });

  it("returns white ink on bright-but-vivid mid-tones (regression: amber #FBBF24 and emerald #34D399 must not flip to black)", () => {
    expect(readableTextOn("#FBBF24")).toBe("#FFFFFF");
    expect(readableTextOn("#34D399")).toBe("#FFFFFF");
  });

  it("returns dark ink on actual pastels and pale neutrals past the 0.6 luminance cutoff", () => {
    expect(readableTextOn("#FFFF00")).toBe("#010205");
    expect(readableTextOn("#F0E68C")).toBe("#010205");
    expect(readableTextOn("#CCCCCC")).toBe("#010205");
  });

  it("normalises 3-digit hex and ignores #RRGGBBAA alpha", () => {
    expect(readableTextOn("#000")).toBe("#FFFFFF");
    expect(readableTextOn("#fff")).toBe("#010205");
    expect(readableTextOn("#010205FF")).toBe("#FFFFFF");
  });

  it("falls back to dark ink on malformed input so missing tooltip color never produces invisible text", () => {
    expect(readableTextOn("not-a-color")).toBe("#010205");
    expect(readableTextOn("")).toBe("#010205");
    expect(readableTextOn("#GGGGGG")).toBe("#010205");
    expect(readableTextOn("#12345")).toBe("#010205");
  });
});
