import type { Item } from "@/lib/types";
import { Flag } from "@/lib/types";

const fsState = vi.hoisted(() => ({
  writes: [] as Array<{ filePath: string; size: number }>,
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();

  return {
    ...actual,
    default: {
      ...actual,
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn((filePath: string, data: string | Uint8Array) => {
        fsState.writes.push({
          filePath,
          size:
            typeof data === "string"
              ? Buffer.byteLength(data)
              : Buffer.from(data).byteLength,
        });
      }),
      readFileSync: vi.fn((filePath: string) => {
        if (String(filePath).endsWith("inter-latin-400-normal.woff")) {
          return Buffer.from("regular-font");
        }

        if (String(filePath).endsWith("inter-latin-700-normal.woff")) {
          return Buffer.from("bold-font");
        }

        return actual.readFileSync(filePath);
      }),
    },
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn((filePath: string, data: string | Uint8Array) => {
      fsState.writes.push({
        filePath,
        size:
          typeof data === "string"
            ? Buffer.byteLength(data)
            : Buffer.from(data).byteLength,
      });
    }),
    readFileSync: vi.fn((filePath: string) => {
      if (String(filePath).endsWith("inter-latin-400-normal.woff")) {
        return Buffer.from("regular-font");
      }

      if (String(filePath).endsWith("inter-latin-700-normal.woff")) {
        return Buffer.from("bold-font");
      }

      return actual.readFileSync(filePath);
    }),
  };
});

vi.mock("satori", () => ({
  default: vi.fn(async () => "<svg><rect width='1200' height='630' /></svg>"),
}));

vi.mock("@resvg/resvg-js", () => ({
  Resvg: class {
    render() {
      return {
        asPng: () =>
          Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01,
          ]),
      };
    }
  },
}));

vi.mock("../../src/lib/config", () => ({
  default: {
    colors: {
      background: "#0E0E12",
      foreground: "#FBFCFF",
      content: "#AFB0B3",
    },
    labels: {
      title: "Technology Radar",
    },
  },
}));

describe("buildOgImages", () => {
  beforeEach(() => {
    fsState.writes = [];
  });

  it("renders a non-empty PNG buffer with PNG magic bytes", async () => {
    const { renderItemOgImagePng } = await import("../buildOgImages");

    const item: Item = {
      id: "react",
      title: "React",
      body: "<p>UI library</p>",
      featured: true,
      ring: "adopt",
      segment: "languages-and-frameworks",
      flag: Flag.Default,
      release: "2024-01",
      position: [0, 0],
    };

    const png = await renderItemOgImagePng({
      item,
      segment: {
        id: "languages-and-frameworks",
        title: "Languages & Frameworks",
        color: "#4A9E7E",
      },
      ring: {
        id: "adopt",
        title: "Adopt",
        color: "#4A9E7E",
      },
    });

    expect(png.byteLength).toBeGreaterThan(8);
    expect(Array.from(png.subarray(0, 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });

  it("creates deterministic cache hashes", async () => {
    const { createItemOgCacheHash } = await import("../buildOgImages");

    const input = {
      title: "React",
      ring: { id: "adopt", title: "Adopt", color: "#4A9E7E" },
      segment: {
        id: "languages-and-frameworks",
        title: "Languages & Frameworks",
        color: "#4A9E7E",
      },
      ogImage: undefined,
    };

    expect(createItemOgCacheHash(input)).toBe(createItemOgCacheHash(input));
    expect(createItemOgCacheHash({ ...input, title: "React Native" })).not.toBe(
      createItemOgCacheHash(input),
    );
  });

  it("writes a rendered image buffer to disk", async () => {
    const { writeOgImage } = await import("../buildOgImages");

    writeOgImage("/fake/og/react.png", Buffer.from([0x89, 0x50, 0x4e]));

    expect(fsState.writes).toEqual([
      { filePath: "/fake/og/react.png", size: 3 },
    ]);
  });
});
