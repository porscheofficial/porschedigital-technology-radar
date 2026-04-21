import config from "@/lib/config";
import type { ItemLink } from "@/lib/types";

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
