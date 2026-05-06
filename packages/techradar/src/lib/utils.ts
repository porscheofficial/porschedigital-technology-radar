import { type ClassValue, clsx } from "clsx";

import config from "./config";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Pick a readable foreground color (`#FFFFFF` or `#010205`) for text laid on
 * top of `hex`. Uses WCAG 2.x relative luminance — the same formula axe-core
 * uses — and a 0.6 cutoff biased toward white ink on saturated mid-tones.
 *
 * Why 0.6 and not the textbook 0.179? The W3C "equal contrast" cutoff
 * (~0.179) splits between ink that meets 4.5:1 against either extreme, but at
 * that boundary a saturated mid-tone like `#9C7E33` (L≈0.22), `#4A9E7E`
 * (L≈0.27), `#FF8A3C` (L≈0.40), or `#C4A85E` (L≈0.41) flips to dark ink — and
 * the *visual* result is muddy, low-contrast brown-on-amber / black-on-orange
 * that users read as illegible even though it passes math. Brand designers
 * routinely override the math to keep saturated theme colors paired with
 * white ink (Material Design and Polaris bias higher for the same reason).
 * 0.6 lands the radar's four light-theme segments
 * (#2D7A5C/#3A6FA0/#9C7E33/#9C3A3A, L≈0.18–0.22), the dark-theme segments
 * (#4A9E7E/#5B8DB8/#C4A85E/#B85B5B, L≈0.27–0.41), saturated team accents
 * (#C45A00/#FF8A3C, L≈0.20/0.40), and bright-but-vivid mid-tones like
 * amber #FBBF24 (L≈0.57) and emerald #34D399 (L≈0.50) all on white ink,
 * while keeping the dark ink for actual pastels and pale neutrals (anything
 * past L≈0.6 — pale yellow, beige, light gray, bright pure yellow). Pure:
 * no DOM, no `window`, safe in SSR/tests.
 *
 * Used by the radar tooltip layer where the background is the segment color
 * (vivid hue, varies per item) and by `_document.tsx` to precompute chip
 * foreground colors from `theme.json` `chips` block. Mirrors the export
 * pipeline, which has always painted tooltip text in `#ffffff`
 * (`exportRadarImage.ts`).
 *
 * Accepts `#RGB`, `#RRGGBB`, and `#RRGGBBAA` (alpha is ignored — text legibility
 * is computed against the opaque tint). Falls back to the dark ink for any
 * unparseable input so a malformed theme value never produces invisible text.
 */
export function readableTextOn(hex: string): "#FFFFFF" | "#010205" {
  const rgb = parseHex(hex);
  if (!rgb) return "#010205";
  const [r, g, b] = rgb.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "#010205" : "#FFFFFF";
}

function parseHex(hex: string): [number, number, number] | null {
  const trimmed = hex.trim().replace(/^#/, "");
  let normalized: string;
  if (trimmed.length === 3) {
    normalized = trimmed
      .split("")
      .map((c) => c + c)
      .join("");
  } else if (trimmed.length === 6 || trimmed.length === 8) {
    normalized = trimmed.slice(0, 6);
  } else {
    return null;
  }
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

export function assetUrl(path: string) {
  if (/^https?:/.test(path)) return path;
  if (!path.startsWith("/")) path = `/${path}`;
  // Resolve basePath with the same precedence as next.config.js:
  // NEXT_PUBLIC_BASE_PATH (deploy-time env, e.g. GitHub Pages) wins over the
  // merged user/default config. Next inlines NEXT_PUBLIC_* into the client
  // bundle at build time, so this works in SSG output too.
  // We deliberately do NOT import next.config.js: it pulls `require("node:path")`
  // into the client bundle (webpack throws UnhandledSchemeError; Turbopack
  // tree-shook it by accident).
  const envBase = process.env.NEXT_PUBLIC_BASE_PATH;
  const rawBase = envBase != null ? envBase : config.basePath;
  const base = rawBase?.replace(/\/+$/, "") || "";
  return `${base}${path}`;
}
