import os from "node:os";
import path from "node:path";
import type { Item, Revision } from "@/lib/types";
import { Flag } from "@/lib/types";

const mockConfigState = vi.hoisted(() => ({
  value: {
    rings: [
      { id: "adopt", title: "Adopt", radius: 0.5 },
      { id: "trial", title: "Trial", radius: 0.69 },
      { id: "assess", title: "Assess", radius: 0.85 },
      { id: "hold", title: "Hold", radius: 1 },
    ],
    quadrants: [
      {
        id: "languages-and-frameworks",
        title: "L&F",
        color: "#4A9E7E",
      },
      {
        id: "methods-and-patterns",
        title: "M&P",
        color: "#5B8DB8",
      },
      {
        id: "platforms-and-operations",
        title: "P&O",
        color: "#C4A85E",
      },
      { id: "tools", title: "Tools", color: "#B85B5B" },
    ],
    chart: { size: 800 },
    tags: [] as string[],
  },
}));

vi.mock("../../next.config.js", () => ({
  default: { basePath: "/technology-radar" },
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

  function mockReadFileSync(
    filePath: Parameters<typeof actual.readFileSync>[0],
    options?: Parameters<typeof actual.readFileSync>[1],
  ) {
    const resolved = path.resolve(String(filePath));

    if (isMockRadarPath(resolved)) {
      return [
        "---",
        "ring: adopt",
        "quadrant: languages-and-frameworks",
        "title: Mock Item",
        "tags:",
        "  - keep",
        "---",
        "Mock body",
      ].join("\n");
    }

    if (resolved.endsWith(`${path.sep}data${path.sep}about.md`)) {
      return "---\n---\nAbout";
    }

    return actual.readFileSync(filePath, options);
  }

  function mockReaddirSync(
    filePath: Parameters<typeof actual.readdirSync>[0],
    options?: Parameters<typeof actual.readdirSync>[1],
  ) {
    const resolved = path.resolve(String(filePath));
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

    if (options === undefined) {
      return actual.readdirSync(filePath);
    }

    return actual.readdirSync(filePath, options);
  }

  function mockWriteFileSync(
    filePath: Parameters<typeof actual.writeFileSync>[0],
    data: Parameters<typeof actual.writeFileSync>[1],
    options?: Parameters<typeof actual.writeFileSync>[2],
  ) {
    const resolved = path.resolve(String(filePath));

    if (
      resolved.endsWith(`${path.sep}data${path.sep}data.json`) ||
      resolved.endsWith(`${path.sep}data${path.sep}about.json`)
    ) {
      return;
    }

    return actual.writeFileSync(filePath, data, options);
  }

  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: mockReadFileSync,
      readdirSync: mockReaddirSync,
      writeFileSync: mockWriteFileSync,
    },
    readFileSync: mockReadFileSync,
    readdirSync: mockReaddirSync,
    writeFileSync: mockWriteFileSync,
  };
});

type BuildDataModule = typeof import("../buildData");
type FsModule = typeof import("node:fs");

let fs: FsModule;

async function loadBuildData(tags: string[] = []): Promise<BuildDataModule> {
  mockConfigState.value.tags = tags;
  vi.resetModules();
  return import("../buildData");
}

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item",
    title: "Item",
    body: "<p>Body</p>",
    featured: true,
    ring: "adopt",
    quadrant: "languages-and-frameworks",
    flag: Flag.Default,
    release: "2024-03",
    position: [0, 0],
    ...overrides,
  };
}

function createRevision(overrides: Partial<Revision> = {}): Revision {
  return {
    release: "2024-01",
    ring: "adopt",
    ...overrides,
  };
}

describe("buildData", () => {
  let tmpDir: string;
  let buildData: BuildDataModule;

  beforeAll(async () => {
    fs = await vi.importActual<FsModule>("node:fs");
  });

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "builddata-test-"));
    buildData = await loadBuildData();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    mockConfigState.value.tags = [];
  });

  function writeFile(relativePath: string, content: string) {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  describe("pure helpers", () => {
    it("orders teams, deduplicates them, and preserves undefined", () => {
      expect(buildData.getOrderedTeams(undefined)).toBeUndefined();
      expect(buildData.getOrderedTeams([])).toEqual([]);
      expect(
        buildData.getOrderedTeams(["platform", "frontend", "platform"]),
      ).toEqual(["frontend", "platform"]);
    });

    it("compares arrays correctly", () => {
      expect(buildData.compareArrays(["a", "b"], ["a", "b"])).toBe(true);
      expect(buildData.compareArrays(["a"], ["a", "b"])).toBe(false);
      expect(buildData.compareArrays(["a", "c"], ["a", "b"])).toBe(false);
      expect(buildData.compareArrays([], [])).toBe(true);
      expect(buildData.compareArrays(undefined, undefined)).toBe(true);
    });

    it("resolves data paths for single and multiple segments", () => {
      expect(buildData.dataPath("radar")).toMatch(
        new RegExp(`data\\${path.sep === "\\" ? "\\\\" : path.sep}radar$`),
      );
      expect(buildData.dataPath("radar", "2024-01", "item.md")).toMatch(
        new RegExp(
          `data\\${path.sep === "\\" ? "\\\\" : path.sep}radar\\${path.sep === "\\" ? "\\\\" : path.sep}2024-01\\${path.sep === "\\" ? "\\\\" : path.sep}item\\.md$`,
        ),
      );
    });
  });

  describe("convertToHtml and rehype pipeline", () => {
    it("converts plain paragraphs and empty strings", async () => {
      await expect(buildData.convertToHtml("Hello world")).resolves.toContain(
        "<p>Hello world</p>",
      );
      await expect(buildData.convertToHtml("")).resolves.toBe("");
    });

    it("rewrites internal links, decorates external links, and renders GFM", async () => {
      const html = await buildData.convertToHtml(
        [
          "[Internal](/languages-and-frameworks/typescript.html)",
          "[External](https://example.com)",
          "",
          "| Name | Status |",
          "| --- | --- |",
          "| TypeScript | ~~legacy~~ |",
        ].join("\n"),
      );

      expect(html).toContain(
        'href="/technology-radar/languages-and-frameworks/typescript/"',
      );
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain("<table>");
      expect(html).toContain("<del>legacy</del>");
    });

    it("highlights code blocks and handles complex markdown", async () => {
      const html = await buildData.convertToHtml(
        [
          "# Heading",
          "",
          "Paragraph with **bold** text.",
          "",
          "```ts",
          "const value = 1;",
          "```",
        ].join("\n"),
      );

      expect(html).toContain("<h1>Heading</h1>");
      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain('class="hljs language language-ts"');
      expect(html).toContain(
        '<span class="hljs language-keyword">const</span>',
      );
    });
  });

  describe("readMarkdownFile", () => {
    it("reads frontmatter, derives id, and converts markdown body to html", async () => {
      writeFile(
        "typescript.md",
        [
          "---",
          'title: "TypeScript"',
          "ring: adopt",
          "quadrant: languages-and-frameworks",
          "---",
          "Body with [link](/tools/tooling.html)",
        ].join("\n"),
      );

      const result = await buildData.readMarkdownFile(
        path.join(tmpDir, "typescript.md"),
      );

      expect(result.id).toBe("typescript");
      expect(result.data).toMatchObject({
        title: "TypeScript",
        ring: "adopt",
        quadrant: "languages-and-frameworks",
      });
      expect(result.body).toContain("<p>");
      expect(result.body).toContain('href="/technology-radar/tools/tooling/"');
    });
  });

  describe("parseDirectory", () => {
    it("parses a single markdown file into one item", async () => {
      writeFile(
        "2024-01/typescript.md",
        [
          "---",
          'title: "TypeScript"',
          "ring: adopt",
          "quadrant: languages-and-frameworks",
          "tags:",
          "  - language",
          "teams:",
          "  - platform",
          "  - frontend",
          "  - platform",
          "---",
          "TypeScript body",
        ].join("\n"),
      );

      const result = await buildData.parseDirectory(tmpDir);

      expect(result.errors).toBe(0);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: "typescript",
        release: "2024-01",
        title: "TypeScript",
        ring: "adopt",
        quadrant: "languages-and-frameworks",
        tags: ["language"],
        teams: ["frontend", "platform"],
      });
      expect(result.items[0].revisions).toEqual([
        {
          release: "2024-01",
          ring: "adopt",
          body: "<p>TypeScript body</p>",
          teams: ["frontend", "platform"],
        },
      ]);
    });

    it("merges revisions from the same item across releases", async () => {
      writeFile(
        "2024-01/react.md",
        [
          "---",
          'title: "React Old"',
          "ring: adopt",
          "quadrant: languages-and-frameworks",
          "tags:",
          "  - frontend",
          "teams:",
          "  - alpha",
          "---",
          "Old body",
        ].join("\n"),
      );
      writeFile(
        "2024-02/react.md",
        [
          "---",
          'title: "React New"',
          "ring: trial",
          "quadrant: tools",
          "tags:",
          "  - ui",
          "teams:",
          "  - beta",
          "featured: false",
          "---",
          "New body",
        ].join("\n"),
      );

      const result = await buildData.parseDirectory(tmpDir);
      const item = result.items[0];

      expect(result.errors).toBe(0);
      expect(item).toMatchObject({
        id: "react",
        release: "2024-02",
        title: "React New",
        ring: "trial",
        quadrant: "tools",
        body: "<p>New body</p>",
        tags: ["ui"],
        teams: ["beta"],
        featured: false,
      });
      expect(item.revisions).toHaveLength(2);
      expect(item.revisions?.[0]).toMatchObject({
        release: "2024-01",
        ring: "adopt",
        teams: ["alpha"],
      });
      expect(item.revisions?.[1]).toMatchObject({
        release: "2024-02",
        ring: "trial",
        teams: ["beta"],
      });
    });

    it("clears teams when a later revision has no teams", async () => {
      writeFile(
        "2024-01/item.md",
        [
          "---",
          'title: "Item"',
          "ring: adopt",
          "quadrant: languages-and-frameworks",
          "teams:",
          "  - alpha",
          "---",
          "Body",
        ].join("\n"),
      );
      writeFile(
        "2024-02/item.md",
        [
          "---",
          'title: "Item"',
          "ring: adopt",
          "quadrant: languages-and-frameworks",
          "---",
          "Body",
        ].join("\n"),
      );

      const result = await buildData.parseDirectory(tmpDir);
      const item = result.items[0];

      expect(item.teams).toEqual([]);
      expect(item.revisions).toHaveLength(2);
      expect(item.revisions?.[0]).toMatchObject({
        release: "2024-01",
        teams: ["alpha"],
      });
      expect(item.revisions?.[1]).toMatchObject({
        release: "2024-02",
        teams: [],
      });
    });

    it("clears tags when a later revision has no tags", async () => {
      writeFile(
        "2024-01/item.md",
        [
          "---",
          'title: "Item"',
          "ring: adopt",
          "quadrant: languages-and-frameworks",
          "tags:",
          "  - frontend",
          "---",
          "Body",
        ].join("\n"),
      );
      writeFile(
        "2024-02/item.md",
        [
          "---",
          'title: "Item"',
          "ring: adopt",
          "quadrant: languages-and-frameworks",
          "---",
          "Body",
        ].join("\n"),
      );

      const result = await buildData.parseDirectory(tmpDir);
      const item = result.items[0];

      expect(item.tags).toEqual([]);
      expect(item.revisions).toHaveLength(2);
    });

    it("marks bodyInherited when a later duplicate has the same body", async () => {
      writeFile(
        "2024-01/vue.md",
        "---\nring: adopt\nquadrant: languages-and-frameworks\n---\nSame body",
      );
      writeFile(
        "vue.md",
        "---\nring: trial\nquadrant: languages-and-frameworks\n---\nSame body",
      );

      const result = await buildData.parseDirectory(tmpDir);
      const revisions = result.items[0].revisions ?? [];

      expect(revisions).toHaveLength(2);
      expect(revisions[1]).toMatchObject({ bodyInherited: true });
    });

    it("marks bodyInherited when a later duplicate has an empty body", async () => {
      writeFile(
        "2024-01/vue.md",
        "---\nring: adopt\nquadrant: languages-and-frameworks\n---\nOriginal body",
      );
      writeFile(
        "vue.md",
        "---\nring: assess\nquadrant: languages-and-frameworks\n---\n",
      );

      const result = await buildData.parseDirectory(tmpDir);
      const revisions = result.items[0].revisions ?? [];

      expect(revisions).toHaveLength(2);
      expect(revisions[1]).toMatchObject({ body: "", bodyInherited: true });
    });

    it("counts invalid frontmatter errors, keeps valid items, sorts by title, and traverses nested directories", async () => {
      writeFile(
        "group-a/2024-01/zeta.md",
        [
          "---",
          'title: "Zeta"',
          "ring: adopt",
          "quadrant: languages-and-frameworks",
          "---",
          "Valid",
        ].join("\n"),
      );
      writeFile(
        "group-b/2024-01/alpha.md",
        [
          "---",
          'title: "Alpha"',
          "ring: trial",
          "quadrant: tools",
          "---",
          "Valid",
        ].join("\n"),
      );
      writeFile(
        "group-b/2024-01/invalid.md",
        "---\nring: bad-ring\nquadrant: tools\n---\nBroken",
      );

      const result = await buildData.parseDirectory(tmpDir);

      expect(result.errors).toBe(1);
      expect(result.items.map((item) => item.title)).toEqual(["Alpha", "Zeta"]);
      expect(result.items.map((item) => item.id)).toEqual(["alpha", "zeta"]);
    });
  });

  describe("post-processing helpers", () => {
    it("computes revision diffs across ring and team changes", () => {
      const revisions: Revision[] = [
        createRevision({ release: "2024-01", ring: "adopt", teams: ["alpha"] }),
        createRevision({
          release: "2024-02",
          ring: "trial",
          teams: ["alpha", "beta"],
        }),
        createRevision({
          release: "2024-03",
          ring: "trial",
          teams: ["beta"],
        }),
      ];

      buildData.computeRevisionDiffs(revisions);

      expect(buildData.computeRevisionDiffs(undefined)).toBeUndefined();
      expect(
        buildData.computeRevisionDiffs([createRevision()]),
      ).toBeUndefined();
      expect(revisions[1]).toMatchObject({
        previousRing: "adopt",
        addedTeams: ["beta"],
      });
      expect(revisions[2]).toMatchObject({ removedTeams: ["alpha"] });
    });

    it("collects unique releases and tags", () => {
      const items: Item[] = [
        createItem({
          tags: ["frontend", "language"],
          revisions: [
            createRevision({ release: "2024-01" }),
            createRevision({ release: "2024-03" }),
          ],
        }),
        createItem({
          id: "item-2",
          title: "Item 2",
          tags: ["frontend", "runtime"],
          revisions: [createRevision({ release: "2024-02" })],
        }),
      ];

      expect(buildData.getUniqueReleases([])).toEqual([]);
      expect(buildData.getUniqueReleases(items)).toEqual([
        "2024-01",
        "2024-02",
        "2024-03",
      ]);
      expect(buildData.getUniqueTags([])).toEqual([]);
      expect(buildData.getUniqueTags(items)).toEqual([
        "frontend",
        "language",
        "runtime",
      ]);
    });

    it("assigns flags based on latest release membership", () => {
      expect(
        buildData.getFlag(
          createItem({ revisions: [createRevision({ release: "2024-01" })] }),
          ["2024-01"],
        ),
      ).toBe(Flag.Default);

      expect(
        buildData.getFlag(
          createItem({
            revisions: [createRevision({ release: "2024-03" })],
          }),
          ["2024-01", "2024-03"],
        ),
      ).toBe(Flag.New);

      expect(
        buildData.getFlag(
          createItem({
            revisions: [
              createRevision({ release: "2024-01" }),
              createRevision({ release: "2024-03" }),
            ],
          }),
          ["2024-01", "2024-03"],
        ),
      ).toBe(Flag.Changed);

      expect(
        buildData.getFlag(
          createItem({
            revisions: [createRevision({ release: "2024-01" })],
          }),
          ["2024-01", "2024-03"],
        ),
      ).toBe(Flag.Default);
    });
  });

  describe("postProcessItems", () => {
    it("assigns positions, bubbles latest team diffs, prunes revisions, reverses them, and removes empty arrays", () => {
      const processed = buildData.postProcessItems([
        createItem({
          id: "change-log",
          title: "Change Log",
          body: "<p>Body B</p>",
          ring: "trial",
          release: "2024-03",
          tags: ["keep"],
          teams: ["beta"],
          revisions: [
            createRevision({
              release: "2024-01",
              ring: "adopt",
              body: "<p>Body A</p>",
              teams: ["alpha"],
            }),
            createRevision({
              release: "2024-02",
              ring: "trial",
              body: "<p>Body B</p>",
              teams: ["alpha", "beta"],
            }),
            createRevision({
              release: "2024-03",
              ring: "trial",
              body: "<p>Body B</p>",
              teams: ["beta"],
            }),
          ],
        }),
        createItem({
          id: "minimal",
          title: "Minimal",
          tags: [],
          teams: [],
          revisions: [],
        }),
      ]);

      expect(processed.releases).toEqual(["2024-01", "2024-02", "2024-03"]);
      expect(processed.tags).toEqual(["keep"]);

      const changed = processed.items.find((item) => item.id === "change-log");
      const minimal = processed.items.find((item) => item.id === "minimal");

      expect(changed).toBeDefined();
      expect(changed?.flag).toBe(Flag.Changed);
      expect(changed?.position[0]).toBeGreaterThanOrEqual(0);
      expect(changed?.position[1]).toBeGreaterThanOrEqual(0);
      expect(changed?.position).not.toEqual([0, 0]);
      expect(changed?.addedTeams).toBeUndefined();
      expect(changed?.removedTeams).toEqual(["alpha"]);
      expect(changed?.revisions).toEqual([
        {
          release: "2024-03",
          ring: "trial",
          body: "<p>Body B</p>",
          teams: ["beta"],
          removedTeams: ["alpha"],
        },
        {
          release: "2024-02",
          ring: "trial",
          body: "<p>Body B</p>",
          teams: ["alpha", "beta"],
          previousRing: "adopt",
          addedTeams: ["beta"],
        },
        {
          release: "2024-01",
          ring: "adopt",
          body: "<p>Body A</p>",
          teams: ["alpha"],
        },
      ]);

      expect(minimal).toBeDefined();
      expect(minimal?.position).not.toEqual([0, 0]);
      expect("revisions" in (minimal ?? {})).toBe(false);
      expect("tags" in (minimal ?? {})).toBe(false);
      expect("teams" in (minimal ?? {})).toBe(false);
    });

    it("filters items by configured tags when config tags are present", async () => {
      const taggedBuildData = await loadBuildData(["keep"]);
      const processed = taggedBuildData.postProcessItems([
        createItem({ id: "keep", title: "Keep", tags: ["keep"] }),
        createItem({ id: "drop", title: "Drop", tags: ["drop"] }),
      ]);

      expect(processed.items.map((item) => item.id)).toEqual(["keep"]);
      expect(processed.tags).toEqual(["keep"]);
    });
  });
});
