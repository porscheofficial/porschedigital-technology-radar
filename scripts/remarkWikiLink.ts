import { consola } from "consola";
import type { Link, PhrasingContent, Root, Text } from "mdast";
import type { Plugin } from "unified";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlipLookupEntry {
  title: string;
  segment: string;
}

/** id → { title, segment } */
export type BlipLookup = Map<string, BlipLookupEntry>;

export interface RemarkWikiLinkOptions {
  /** Shared lookup populated during parseDirectory. */
  lookup: BlipLookup;
  /** When true, unresolved wiki-links cause a build error. */
  strict?: boolean;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let unresolvedCount = 0;

export function getUnresolvedCount(): number {
  return unresolvedCount;
}

export function resetUnresolvedCount(): void {
  unresolvedCount = 0;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const WIKI_LINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

/**
 * Remark plugin: resolve `[[id]]` and `[[id|label]]` wiki-links to internal
 * anchor nodes pointing at `/${segment}/${id}`.
 *
 * Unresolved links are logged as warnings (or errors in strict mode) and
 * rendered as plain text.
 */
export const remarkWikiLink: Plugin<[RemarkWikiLinkOptions], Root> = (
  options,
) => {
  const { lookup, strict = false } = options;

  return (tree) => {
    visitText(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;

      const result = splitWikiLinks(node.value, lookup, strict);
      if (!result) return;

      parent.children.splice(index, 1, ...result);
    });
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Walk mdast tree, calling `fn` for every text node with parent context. */
function visitText(
  tree: Root,
  fn: (
    node: Text,
    index: number,
    parent: { children: PhrasingContent[] },
  ) => void,
): void {
  function walk(
    node: Root | Root["children"][number],
    parent?: { children: PhrasingContent[] },
    index?: number,
  ): void {
    if (node.type === "text" && parent && index !== undefined) {
      fn(node as Text, index, parent);
    }
    if ("children" in node) {
      // Walk backwards so splicing doesn't shift indices
      const children = node.children as PhrasingContent[];
      for (let i = children.length - 1; i >= 0; i--) {
        walk(children[i], node as { children: PhrasingContent[] }, i);
      }
    }
  }
  walk(tree);
}

/**
 * Parse a text node value for `[[id]]` / `[[id|label]]` patterns.
 * Returns null if no wiki-links found, otherwise an array of text/link nodes.
 */
export function splitWikiLinks(
  text: string,
  lookup: BlipLookup,
  strict: boolean,
): PhrasingContent[] | null {
  const matches = [...text.matchAll(WIKI_LINK_RE)];
  if (matches.length === 0) return null;

  const result: PhrasingContent[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const fullMatch = match[0];
    const id = match[1].trim();
    const label = match[2]?.trim();
    const matchStart = match.index;

    if (matchStart > lastIndex) {
      result.push({ type: "text", value: text.slice(lastIndex, matchStart) });
    }

    const entry = lookup.get(id);

    if (entry) {
      const linkNode: Link = {
        type: "link",
        url: `/${entry.segment}/${id}`,
        children: [{ type: "text", value: label ?? entry.title }],
      };
      result.push(linkNode);
    } else {
      unresolvedCount++;
      const displayText = label ?? id;
      if (strict) {
        consola.error(`Unresolved wiki-link: [[${id}]]`);
      } else {
        consola.warn(`Unresolved wiki-link: [[${id}]] — rendered as text`);
      }
      result.push({ type: "text", value: displayText });
    }

    lastIndex = matchStart + fullMatch.length;
  }

  if (lastIndex < text.length) {
    result.push({ type: "text", value: text.slice(lastIndex) });
  }

  return result;
}
