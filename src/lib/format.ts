import { getAppName } from "@/lib/data";

export function format(text: string, context: Record<string, string>): string {
  return text.replace(/{(\w+)}/g, (match, key) => {
    return context[key] || match;
  });
}

export function formatTitle(...title: string[]): string {
  return [...title, getAppName()].join(" | ");
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
