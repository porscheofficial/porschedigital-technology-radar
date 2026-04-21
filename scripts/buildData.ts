import fs from "node:fs";
import path from "node:path";
import matter from "@11ty/gray-matter";
import { consola } from "consola";
import rehypeExternalLinks from "rehype-external-links";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { Flag, type Item } from "@/lib/types";
import nextConfig from "../next.config.js";
import config from "../src/lib/config";
import Positioner from "./positioner";
import {
  type BlipLookup,
  getUnresolvedCount,
  remarkWikiLink,
  resetUnresolvedCount,
} from "./remarkWikiLink";
import { parseRadarFrontmatter } from "./validateFrontmatter";

// ---------------------------------------------------------------------------
// Config-derived constants
// ---------------------------------------------------------------------------

const {
  rings,
  chart: { size },
} = config;

const quadrants = config.quadrants.map((q, i) => ({ ...q, position: i + 1 }));
const configTags = (config as { tags?: string[] }).tags ?? [];

const positioner = new Positioner(size, quadrants, rings);
const isStrict = process.argv.slice(2).includes("--strict");

consola.info(`Build mode: ${isStrict ? "strict" : "lenient"}`);

// ---------------------------------------------------------------------------
// Unified markdown → HTML processor
// ---------------------------------------------------------------------------

/** Rehype plugin: prepend basePath to internal links */
export function rehypeBasePathLinks() {
  const basePath = nextConfig.basePath;
  if (!basePath) return () => {};

  return (tree: import("hast").Root) => {
    visit(tree, "element", (node: import("hast").Element) => {
      if (node.tagName === "a" && typeof node.properties.href === "string") {
        const href = node.properties.href;
        if (href.startsWith("/")) {
          node.properties.href = `${basePath}${href}`;
        }
      }
    });
  };
}

/** Rehype plugin: strip deprecated .html extensions from internal links */
export function rehypeStripHtmlExtension() {
  return (tree: import("hast").Root) => {
    visit(tree, "element", (node: import("hast").Element) => {
      if (node.tagName === "a" && typeof node.properties.href === "string") {
        node.properties.href = node.properties.href.replace(
          /^(\/[^?#]+)\.html/,
          "$1/",
        );
      }
    });
  };
}

/** Rehype plugin: transform external links to PDS <p-link-pure> web components */
export function rehypePdsExternalLinks() {
  return (tree: import("hast").Root) => {
    visit(tree, "element", (node: import("hast").Element) => {
      if (
        node.tagName === "a" &&
        node.properties.target === "_blank" &&
        typeof node.properties.href === "string"
      ) {
        node.tagName = "p-link-pure";
        node.properties["align-label"] = "start";
        node.properties.icon = "external";
        node.properties.underline = "true";
        node.properties.theme = "dark";
      }
    });
  };
}

/** Simple hast visitor — walks element nodes */
export function visit(
  tree: import("hast").Root,
  type: string,
  fn: (node: import("hast").Element) => void,
) {
  function walk(node: import("hast").Root | import("hast").RootContent) {
    if ("type" in node && node.type === type) {
      fn(node as import("hast").Element);
    }
    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }
  walk(tree);
}

export function createProcessor(blipLookup?: BlipLookup, strict?: boolean) {
  const pipeline = unified().use(remarkParse).use(remarkGfm);

  if (blipLookup) {
    pipeline.use(remarkWikiLink, { lookup: blipLookup, strict });
  }

  return (
    pipeline
      .use(remarkRehype)
      // Defense-in-depth: strip raw HTML / event handlers / javascript: URIs.
      // remarkRehype is invoked WITHOUT `allowDangerousHtml`, so raw HTML in
      // markdown is already dropped at the mdast→hast boundary. Sanitize is the
      // backstop in case a future plugin re-introduces raw HTML, and the
      // anchor-rewriting plugins below run AFTER sanitize so the `target`,
      // `rel`, and `<p-link-pure>` they emit are not subject to the schema.
      // (See ADR-0006.)
      .use(rehypeSanitize, defaultSchema)
      .use(rehypeStripHtmlExtension)
      .use(rehypeBasePathLinks)
      .use(rehypeExternalLinks, {
        target: "_blank",
        rel: ["noopener", "noreferrer"],
      })
      .use(rehypePdsExternalLinks)
      .use(rehypeHighlight, { prefix: "hljs language-" })
      .use(rehypeStringify)
  );
}

const defaultProcessor = createProcessor();

export async function convertToHtml(
  markdown: string,
  processor = defaultProcessor,
): Promise<string> {
  const result = await processor.process(markdown.trim());
  return String(result);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function dataPath(...paths: string[]): string {
  return path.resolve("data", ...paths);
}

export function getOrderedTeams(
  teams: string[] | undefined,
): string[] | undefined {
  if (!teams) return undefined;
  return [...new Set(teams)].sort();
}

export function compareArrays(arr1: unknown[] = [], arr2: unknown[] = []) {
  return (
    arr1.length === arr2.length &&
    arr1.every((element, index) => element === arr2[index])
  );
}

export function preScanBlipLookup(dirPath: string): BlipLookup {
  const lookup: BlipLookup = new Map();

  function scan(dir: string): void {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const id = path.basename(fullPath, ".md");
        if (lookup.has(id)) continue;

        const fileContent = fs.readFileSync(fullPath, "utf8");
        const { data } = matter(fileContent);
        const frontmatter = parseRadarFrontmatter(data, fullPath);
        if (frontmatter) {
          lookup.set(id, {
            title: frontmatter.title ?? id,
            quadrant: frontmatter.quadrant,
          });
        }
      }
    }
  }

  scan(dirPath);
  return lookup;
}

// ---------------------------------------------------------------------------
// Parse markdown files
// ---------------------------------------------------------------------------

export async function readMarkdownFile(
  filePath: string,
  processor = defaultProcessor,
) {
  const id = path.basename(filePath, ".md");
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);
  const body = await convertToHtml(content, processor);
  return { id, data, body };
}

// Build-time directory walker: traverses month folders, parses each markdown
// file, and aggregates errors. The branching is essential (per-file try/catch,
// optional revisions, optional teams) and refactoring would fragment the
// pipeline without reducing real complexity. See ADR-0010.
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function parseDirectory(
  dirPath: string,
  processor = defaultProcessor,
): Promise<{
  items: Item[];
  errors: number;
}> {
  const items: Record<string, Item> = {};
  let errors = 0;

  const entries = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const sub = await parseDirectory(fullPath, processor);
      for (const item of sub.items) {
        if (!items[item.id]) {
          items[item.id] = item;
        } else {
          const existing = items[item.id];
          existing.release = item.release;
          existing.body = item.body || existing.body;
          existing.title = item.title || existing.title;
          existing.ring = item.ring || existing.ring;
          existing.quadrant = item.quadrant || existing.quadrant;
          existing.tags = item.tags;
          existing.teams = item.teams;
          existing.links = item.links;
          existing.featured = item.featured;
          if (item.revisions) {
            existing.revisions = [
              ...(existing.revisions ?? []),
              ...item.revisions,
            ];
            // Mark revisions whose body is identical to the previous revision
            // (mirrors the same check done in the file-level merge branch)
            for (let i = 1; i < existing.revisions.length; i++) {
              const rev = existing.revisions[i];
              const prev = existing.revisions[i - 1];
              if (rev.body === "" || rev.body === prev.body) {
                rev.bodyInherited = true;
              }
            }
          }
        }
      }
      errors += sub.errors;
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const releaseDate = path.basename(path.dirname(fullPath));
      const { id, data, body } = await readMarkdownFile(fullPath, processor);
      const frontmatter = parseRadarFrontmatter(data, fullPath);

      if (!frontmatter) {
        errors++;
        continue;
      }

      const teams = getOrderedTeams(frontmatter.teams);

      if (!items[id]) {
        items[id] = {
          id,
          release: releaseDate,
          title: frontmatter.title ?? id,
          ring: frontmatter.ring,
          quadrant: frontmatter.quadrant,
          body,
          featured: frontmatter.featured,
          flag: Flag.Default,
          tags: frontmatter.tags,
          revisions: [
            {
              release: releaseDate,
              ring: frontmatter.ring,
              body,
              teams,
            },
          ],
          position: [0, 0],
          teams: teams ?? [],
          links: frontmatter.links,
        };
      } else {
        const existing = items[id];
        existing.release = releaseDate;
        existing.body = body || existing.body;
        existing.title = frontmatter.title ?? existing.title;
        existing.ring = frontmatter.ring;
        existing.quadrant = frontmatter.quadrant;
        existing.tags = frontmatter.tags;
        existing.teams = teams;
        existing.links = frontmatter.links;
        existing.featured = frontmatter.featured;

        const prevBody =
          existing.revisions?.[existing.revisions.length - 1]?.body;
        existing.revisions?.push({
          release: releaseDate,
          ring: frontmatter.ring,
          body,
          ...(body === "" || body === prevBody ? { bodyInherited: true } : {}),
          teams,
        });
      }
    }
  }

  return {
    items: Object.values(items).sort((a, b) => a.title.localeCompare(b.title)),
    errors,
  };
}

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------

export function computeRevisionDiffs(revisions: Item["revisions"]): void {
  if (!revisions || revisions.length < 2) return;
  for (let i = 1; i < revisions.length; i++) {
    const prevTeams = revisions[i - 1].teams ?? [];
    const currTeams = revisions[i].teams ?? [];
    const added = currTeams.filter((t) => !prevTeams.includes(t));
    const removed = prevTeams.filter((t) => !currTeams.includes(t));
    if (added.length > 0) revisions[i].addedTeams = added;
    if (removed.length > 0) revisions[i].removedTeams = removed;
    if (revisions[i].ring !== revisions[i - 1].ring) {
      revisions[i].previousRing = revisions[i - 1].ring;
    }
  }
}

export function getUniqueReleases(items: Item[]): string[] {
  const releases = new Set<string>();
  for (const item of items) {
    for (const revision of item.revisions ?? []) {
      releases.add(revision.release);
    }
  }
  return Array.from(releases).sort();
}

export function getUniqueTags(items: Item[]): string[] {
  const tags = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags ?? []) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}

export function getFlag(item: Item, allReleases: string[]): Flag {
  if (allReleases.length === 1) return Flag.Default;

  const latestRelease = allReleases[allReleases.length - 1];
  const revisions = item.revisions ?? [];
  const isInLatestRelease =
    revisions.length > 0 &&
    revisions[revisions.length - 1].release === latestRelease;

  if (revisions.length === 1 && isInLatestRelease) return Flag.New;
  if (revisions.length > 1 && isInLatestRelease) return Flag.Changed;
  return Flag.Default;
}

export function postProcessItems(items: Item[]): {
  releases: string[];
  tags: string[];
  items: Item[];
} {
  const filteredItems =
    configTags.length > 0
      ? items.filter((item) =>
          item.tags?.some((tag) => configTags.includes(tag)),
        )
      : items;

  const releases = getUniqueReleases(filteredItems);
  const uniqueTags = getUniqueTags(filteredItems);

  for (const item of filteredItems) {
    computeRevisionDiffs(item.revisions);
  }

  const processedItems = filteredItems.map((item) => {
    const lastRevision = item.revisions?.[item.revisions.length - 1];
    const processedItem = {
      ...item,
      position: positioner.getNextPosition(item.quadrant, item.ring),
      flag: getFlag(item, releases),
      ...(lastRevision?.addedTeams && { addedTeams: lastRevision.addedTeams }),
      ...(lastRevision?.removedTeams && {
        removedTeams: lastRevision.removedTeams,
      }),
      revisions: item.revisions
        ?.filter((revision, index, revisions) => {
          if (index === 0) return true;
          const { ring, body } = revision;
          const prev = revisions[index - 1];
          const teamsChanged = prev
            ? !compareArrays(revision.teams, prev.teams)
            : false;
          return (
            ring !== item.ring ||
            teamsChanged ||
            (body !== "" && body !== item.body && body !== prev?.body)
          );
        })
        .reverse(),
    };

    if (!processedItem.revisions?.length) delete processedItem.revisions;
    if (!processedItem.tags?.length) delete processedItem.tags;
    if (!processedItem.teams?.length) delete processedItem.teams;
    if (!processedItem.links?.length) delete processedItem.links;

    return processedItem;
  });

  return { releases, tags: uniqueTags, items: processedItems };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = performance.now();

  consola.start("Building radar data...");

  const radarDir = dataPath("radar");
  const blipLookup = preScanBlipLookup(radarDir);
  resetUnresolvedCount();
  const wikiProcessor = createProcessor(blipLookup, isStrict);

  const { items, errors } = await parseDirectory(radarDir, wikiProcessor);

  if (errors > 0) {
    consola.warn(`${errors} file(s) had invalid frontmatter`);
    if (isStrict) {
      consola.fatal("Aborting — strict mode enabled");
      process.exit(1);
    }
  }

  const unresolved = getUnresolvedCount();
  if (unresolved > 0 && isStrict) {
    consola.fatal(
      `${unresolved} unresolved wiki-link(s) — aborting (strict mode)`,
    );
    process.exit(1);
  }

  const data = postProcessItems(items);

  if (data.items.length === 0) {
    consola.fatal(
      "No valid radar items found. Check the markdown files in data/radar/",
    );
    process.exit(1);
  }

  fs.writeFileSync(dataPath("data.json"), JSON.stringify(data, null, 2));

  const about = await readMarkdownFile(dataPath("about.md"));
  fs.writeFileSync(dataPath("about.json"), JSON.stringify(about, null, 2));

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

  consola.success(
    `Built ${data.items.length} items across ${data.releases.length} releases (${elapsed}s)`,
  );
  consola.info("Output: data/data.json, data/about.json");
}

if (require.main === module) {
  main();
}
