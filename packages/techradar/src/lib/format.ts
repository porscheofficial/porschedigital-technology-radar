import config from "@/lib/config";
import type { Item, ItemLink } from "@/lib/types";

export function format(text: string, context: Record<string, string>): string {
  return text.replace(/{(\w+)}/g, (match, key) => {
    return context[key] || match;
  });
}

export function formatTitle(...title: string[]): string {
  return [...title, config.labels.title || ""].join(" | ");
}

function toSafeDate(release: string): Date {
  return new Date(`${release}T00:00:00`);
}

export function formatRelease(release: string): string {
  return toSafeDate(release).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatReleaseShort(release: string): string {
  return toSafeDate(release).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatReleaseCompact(release: string): string {
  return toSafeDate(release).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

export function stripHtml(html: string): string {
  // Loop until stable so that overlapping/nested patterns like
  // `<<script>script>` cannot bypass a single-pass strip
  // (CodeQL js/incomplete-multi-character-sanitization).
  let prev: string;
  let next = html;
  do {
    prev = next;
    next = prev.replace(/<[^>]*>/g, "");
  } while (next !== prev);
  return next.trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function deriveSummary(item: Item): string {
  if (item.summary) return item.summary;

  const text = stripHtml(item.body).replace(/\s+/g, " ").trim();
  const maxLength = 160;

  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const safeClip = (
    lastSpace > maxLength * 0.6
      ? clipped.slice(0, lastSpace)
      : clipped.slice(0, maxLength)
  ).trimEnd();

  return `${safeClip}…`;
}

export function formatLinkLabel(link: ItemLink): string {
  if (link.name) return link.name;
  try {
    const url = new URL(link.url);
    return url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
  } catch {
    return link.url;
  }
}

export function matchesAbbreviation(title: string, query: string): boolean {
  const initials = title
    .split(/[\s\-/&.]+/)
    .filter(Boolean)
    .map((word) => word[0].toLowerCase())
    .join("");
  return initials.startsWith(query.toLowerCase());
}

/**
 * Lowercase haystack of an item's most-recall-able fields for substring
 * search. Excludes `body`: it is HTML, balloons the index, and dilutes
 * ranking. Use a dedicated full-text index instead if body search is needed.
 */
export function searchableTextFor(item: Item): string {
  return [
    item.title,
    item.summary ?? "",
    ...(item.tags ?? []),
    ...(item.teams ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

const plainTextBodyCache = new WeakMap<Item, string>();

/**
 * Plain-text projection of `item.body` (HTML), memoized per item via
 * WeakMap so each item is stripped at most once per session. Whitespace
 * collapsed and lowercased for substring search.
 */
export function plainTextBodyFor(item: Item): string {
  const cached = plainTextBodyCache.get(item);
  if (cached !== undefined) return cached;
  const text = stripHtml(item.body ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  plainTextBodyCache.set(item, text);
  return text;
}

/**
 * Returns a contextual snippet around the first occurrence of `query`
 * inside `text` (case-insensitive), bounded by `ctx` chars on each side
 * and prefixed/suffixed with an ellipsis when clipped. Returns `null`
 * when the query is not found.
 */
export function extractSnippet(
  text: string,
  query: string,
  ctx = 60,
): string | null {
  const q = query.trim();
  if (!q || !text) return null;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return null;

  const rawStart = Math.max(0, idx - ctx);
  const rawEnd = Math.min(text.length, idx + q.length + ctx);

  let start = rawStart;
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < idx) start = space + 1;
  }
  let end = rawEnd;
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space !== -1 && space > idx + q.length) end = space;
  }

  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}
