import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import {
  type BlipLookup,
  getUnresolvedCount,
  remarkWikiLink,
  resetUnresolvedCount,
  splitWikiLinks,
} from "../remarkWikiLink";

vi.mock("consola", () => ({
  consola: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createLookup(
  entries: Record<string, { title: string; segment: string }> = {},
): BlipLookup {
  return new Map(Object.entries(entries));
}

function createProcessor(lookup: BlipLookup, strict = false) {
  return unified()
    .use(remarkParse)
    .use(remarkWikiLink, { lookup, strict })
    .use(remarkRehype)
    .use(rehypeStringify);
}

async function process(markdown: string, lookup: BlipLookup, strict = false) {
  const result = await createProcessor(lookup, strict).process(markdown.trim());
  return String(result);
}

const lookup = createLookup({
  typescript: { title: "TypeScript", segment: "languages-and-frameworks" },
  react: { title: "React", segment: "languages-and-frameworks" },
  kubernetes: { title: "Kubernetes", segment: "platforms-and-operations" },
});

describe("remarkWikiLink", () => {
  beforeEach(() => {
    resetUnresolvedCount();
    vi.clearAllMocks();
  });

  describe("splitWikiLinks", () => {
    it("returns null for text without wiki-links", () => {
      expect(splitWikiLinks("plain text", lookup, false)).toBeNull();
      expect(splitWikiLinks("[[", lookup, false)).toBeNull();
      expect(splitWikiLinks("[not a link]", lookup, false)).toBeNull();
    });

    it("resolves a simple wiki-link", () => {
      const result = splitWikiLinks("See [[typescript]]", lookup, false);
      expect(result).toHaveLength(2);
      expect(result?.[0]).toEqual({ type: "text", value: "See " });
      expect(result?.[1]).toMatchObject({
        type: "link",
        url: "/languages-and-frameworks/typescript",
        children: [{ type: "text", value: "TypeScript" }],
      });
    });

    it("resolves a wiki-link with custom label", () => {
      const result = splitWikiLinks(
        "[[kubernetes|our K8s setup]]",
        lookup,
        false,
      );
      expect(result).toHaveLength(1);
      expect(result?.[0]).toMatchObject({
        type: "link",
        url: "/platforms-and-operations/kubernetes",
        children: [{ type: "text", value: "our K8s setup" }],
      });
    });

    it("resolves multiple wiki-links in the same text", () => {
      const result = splitWikiLinks(
        "Use [[typescript]] with [[react]] for UI",
        lookup,
        false,
      );
      expect(result).toHaveLength(5);
      expect(result?.[0]).toEqual({ type: "text", value: "Use " });
      expect(result?.[1]).toMatchObject({ type: "link" });
      expect(result?.[2]).toEqual({ type: "text", value: " with " });
      expect(result?.[3]).toMatchObject({ type: "link" });
      expect(result?.[4]).toEqual({ type: "text", value: " for UI" });
    });

    it("renders unresolved links as plain text", () => {
      const result = splitWikiLinks("See [[nonexistent]]", lookup, false);
      expect(result).toHaveLength(2);
      expect(result?.[0]).toEqual({ type: "text", value: "See " });
      expect(result?.[1]).toEqual({ type: "text", value: "nonexistent" });
      expect(getUnresolvedCount()).toBe(1);
    });

    it("uses custom label for unresolved links", () => {
      const result = splitWikiLinks("[[nonexistent|My Label]]", lookup, false);
      expect(result).toHaveLength(1);
      expect(result?.[0]).toEqual({ type: "text", value: "My Label" });
    });

    it("trims whitespace in id and label", () => {
      const result = splitWikiLinks(
        "[[ typescript | TS Lang ]]",
        lookup,
        false,
      );
      expect(result).toHaveLength(1);
      expect(result?.[0]).toMatchObject({
        type: "link",
        url: "/languages-and-frameworks/typescript",
        children: [{ type: "text", value: "TS Lang" }],
      });
    });
  });

  describe("full pipeline integration", () => {
    it("converts wiki-links to anchor elements", async () => {
      const html = await process("See [[typescript]] for details.", lookup);
      expect(html).toContain(
        '<a href="/languages-and-frameworks/typescript">TypeScript</a>',
      );
      expect(html).toContain("See ");
      expect(html).toContain(" for details.");
    });

    it("converts wiki-links with custom labels", async () => {
      const html = await process("[[kubernetes|our K8s setup]]", lookup);
      expect(html).toContain(
        '<a href="/platforms-and-operations/kubernetes">our K8s setup</a>',
      );
    });

    it("renders unresolved wiki-links as plain text", async () => {
      const html = await process("Check [[missing-blip]] here.", lookup);
      expect(html).toContain("missing-blip");
      expect(html).not.toContain("<a");
      expect(getUnresolvedCount()).toBe(1);
    });

    it("leaves regular markdown links untouched", async () => {
      const html = await process("[Normal link](https://example.com)", lookup);
      expect(html).toContain('href="https://example.com"');
    });

    it("handles wiki-links alongside regular markdown", async () => {
      const html = await process(
        "Use **[[typescript]]** in your project.",
        lookup,
      );
      expect(html).toContain("<strong>");
      expect(html).toContain(
        '<a href="/languages-and-frameworks/typescript">TypeScript</a>',
      );
    });

    it("handles multiple wiki-links in one paragraph", async () => {
      const html = await process(
        "We use [[typescript]] and [[react]] together.",
        lookup,
      );
      expect(html).toContain(
        '<a href="/languages-and-frameworks/typescript">TypeScript</a>',
      );
      expect(html).toContain(
        '<a href="/languages-and-frameworks/react">React</a>',
      );
    });
  });

  describe("strict mode", () => {
    it("logs warning for unresolved links in lenient mode", async () => {
      const { consola } = await import("consola");
      await process("[[missing]]", lookup, false);
      expect(consola.warn).toHaveBeenCalledWith(
        "Unresolved wiki-link: [[missing]] — rendered as text",
      );
    });

    it("logs error for unresolved links in strict mode", async () => {
      const { consola } = await import("consola");
      await process("[[missing]]", lookup, true);
      expect(consola.error).toHaveBeenCalledWith(
        "Unresolved wiki-link: [[missing]]",
      );
    });

    it("increments unresolved count per unresolved link", async () => {
      await process("[[a]] and [[b]] and [[typescript]]", lookup, false);
      expect(getUnresolvedCount()).toBe(2);
    });
  });
});
