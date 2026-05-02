import path from "node:path";

const mockConfigState = vi.hoisted(() => ({
  value: {
    rings: [{ id: "adopt", title: "Adopt", radius: 1 }],
    segments: [{ id: "tools", title: "Tools", color: "#000" }],
    chart: { size: 800 },
    tags: [] as string[],
  },
}));

vi.mock("../../next.config.js", () => ({
  default: { basePath: "" },
}));

vi.mock("../../src/lib/config", () => ({
  default: mockConfigState.value,
}));

vi.mock("consola", () => ({
  consola: {
    info: vi.fn(),
    start: vi.fn(),
    warn: vi.fn(),
    fatal: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();

  function mockDirent(name: string, type: "file" | "directory") {
    return {
      name,
      isDirectory: () => type === "directory",
      isFile: () => type === "file",
    };
  }

  function isMockRadarPath(filePath: string) {
    return filePath.endsWith(
      `${path.sep}data${path.sep}radar${path.sep}2024-01${path.sep}mock-item.md`,
    );
  }

  function mockReaddirSync(
    p: Parameters<typeof actual.readdirSync>[0],
    options?: Parameters<typeof actual.readdirSync>[1],
  ) {
    const resolved = path.resolve(String(p));
    const withDirents =
      options !== undefined &&
      typeof options === "object" &&
      "withFileTypes" in options &&
      options.withFileTypes;

    if (resolved.endsWith(`${path.sep}data${path.sep}radar`) && withDirents) {
      return [mockDirent("2024-01", "directory")];
    }

    if (
      resolved.endsWith(`${path.sep}data${path.sep}radar${path.sep}2024-01`) &&
      withDirents
    ) {
      return [mockDirent("mock-item.md", "file")];
    }

    return options === undefined
      ? actual.readdirSync(p)
      : actual.readdirSync(p, options);
  }

  function mockReadFileSync(
    p: Parameters<typeof actual.readFileSync>[0],
    options?: Parameters<typeof actual.readFileSync>[1],
  ) {
    const resolved = path.resolve(String(p));
    if (isMockRadarPath(resolved)) {
      return [
        "---",
        "ring: adopt",
        "segment: tools",
        "title: Mock",
        "---",
        "Mock body",
      ].join("\n");
    }
    if (resolved.endsWith(`${path.sep}data${path.sep}about.md`)) {
      return "---\n---\nAbout";
    }
    return actual.readFileSync(p, options);
  }

  function mockWriteFileSync(
    p: Parameters<typeof actual.writeFileSync>[0],
    data: Parameters<typeof actual.writeFileSync>[1],
    options?: Parameters<typeof actual.writeFileSync>[2],
  ) {
    const resolved = path.resolve(String(p));
    if (
      resolved.endsWith(`${path.sep}data${path.sep}data.json`) ||
      resolved.endsWith(`${path.sep}data${path.sep}about.json`)
    ) {
      return;
    }
    return actual.writeFileSync(p, data, options);
  }

  return {
    ...actual,
    default: {
      ...actual,
      readdirSync: mockReaddirSync,
      readFileSync: mockReadFileSync,
      writeFileSync: mockWriteFileSync,
    },
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  };
});

type BuildDataModule = typeof import("../buildData");

async function loadBuildData(): Promise<BuildDataModule> {
  vi.resetModules();
  return import("../buildData");
}

describe("rehype-sanitize boundary (XSS regression)", () => {
  let buildData: BuildDataModule;

  beforeEach(async () => {
    buildData = await loadBuildData();
  });

  it("strips raw <script> tags from markdown (executable surface only)", async () => {
    const html = await buildData.convertToHtml(
      "Hello <script>alert(1)</script> world",
    );
    expect(html).not.toContain("<script");
  });

  it("strips inline event handlers (onerror, onclick, ...)", async () => {
    const html = await buildData.convertToHtml(
      'Image: <img src="x" onerror="alert(1)">',
    );
    expect(html).not.toContain("onerror");
  });

  it("rejects javascript: URIs in markdown links", async () => {
    const html = await buildData.convertToHtml(
      "[click me](javascript:alert(1))",
    );
    expect(html).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
  });

  it("rejects javascript: URIs even when wrapped in autolinks", async () => {
    const html = await buildData.convertToHtml("<javascript:alert(1)>");
    expect(html).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
  });

  it("strips <iframe> tags", async () => {
    const html = await buildData.convertToHtml(
      'Embed: <iframe src="https://evil.example.com"></iframe>',
    );
    expect(html).not.toContain("<iframe");
  });

  it("preserves safe markdown constructs (headings, code, links)", async () => {
    const html = await buildData.convertToHtml(
      ["## Heading", "", "Some `code` and a [link](https://example.com)."].join(
        "\n",
      ),
    );
    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain('href="https://example.com"');
  });
});
