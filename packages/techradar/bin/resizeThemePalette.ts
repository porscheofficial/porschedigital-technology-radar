import { readFileSync, writeFileSync } from "node:fs";
import {
  applyEdits,
  type FormattingOptions,
  modify,
  type ParseError,
  parse as parseJsonc,
} from "jsonc-parser";

const FORMATTING: FormattingOptions = {
  insertSpaces: true,
  tabSize: 2,
  eol: "\n",
};

type PaletteEntry = unknown;

interface ResizeOutcome {
  changed: boolean;
  segments: { before: number; after: number };
  rings: { before: number; after: number };
}

function cyclePalette(
  source: PaletteEntry[],
  targetLength: number,
): PaletteEntry[] {
  if (source.length === 0) {
    throw new Error(
      "cyclePalette: source palette is empty — Zod schema requires .min(1); refusing to resize from zero",
    );
  }
  const out: PaletteEntry[] = new Array(targetLength);
  for (let i = 0; i < targetLength; i += 1) {
    out[i] = source[i % source.length];
  }
  return out;
}

/**
 * Resize the `radar.segments` and `radar.rings` palette arrays inside a
 * theme `manifest.jsonc` to match the consumer's chosen taxonomy size.
 *
 * Uses `jsonc-parser`'s surgical `modify`/`applyEdits` so comments and the
 * surrounding formatting are preserved — annotated themes like
 * `data/themes/.example/manifest.jsonc` keep their documentation intact.
 *
 * Returns metadata describing what changed. Throws only on JSONC parse
 * errors or structurally invalid manifests (missing `radar.segments` /
 * `radar.rings` arrays). Length mismatches alone are NOT errors; this
 * function is the fix for them.
 */
export function resizeThemeManifestPalettes(
  manifestSource: string,
  segmentsCount: number,
  ringsCount: number,
): { source: string; outcome: ResizeOutcome } {
  if (segmentsCount < 1 || ringsCount < 1) {
    throw new Error(
      `resizeThemeManifestPalettes: counts must be >= 1 (got segments=${segmentsCount}, rings=${ringsCount})`,
    );
  }

  const errors: ParseError[] = [];
  const parsed = parseJsonc(manifestSource, errors, {
    allowTrailingComma: true,
  }) as unknown;

  if (errors.length > 0) {
    const detail = errors
      .map((e) => `offset ${e.offset}: error code ${e.error}`)
      .join("; ");
    throw new Error(
      `resizeThemeManifestPalettes: JSONC parse error — ${detail}`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("radar" in parsed) ||
    typeof (parsed as { radar: unknown }).radar !== "object" ||
    (parsed as { radar: unknown }).radar === null
  ) {
    throw new Error(
      "resizeThemeManifestPalettes: manifest has no `radar` object",
    );
  }

  const radar = (parsed as { radar: { segments?: unknown; rings?: unknown } })
    .radar;

  if (!Array.isArray(radar.segments) || !Array.isArray(radar.rings)) {
    throw new Error(
      "resizeThemeManifestPalettes: `radar.segments` and `radar.rings` must be arrays",
    );
  }

  const currentSegments = radar.segments as PaletteEntry[];
  const currentRings = radar.rings as PaletteEntry[];

  let working = manifestSource;
  let changed = false;

  if (currentSegments.length !== segmentsCount) {
    const next = cyclePalette(currentSegments, segmentsCount);
    const edits = modify(working, ["radar", "segments"], next, {
      formattingOptions: FORMATTING,
    });
    working = applyEdits(working, edits);
    changed = true;
  }

  if (currentRings.length !== ringsCount) {
    const next = cyclePalette(currentRings, ringsCount);
    const edits = modify(working, ["radar", "rings"], next, {
      formattingOptions: FORMATTING,
    });
    working = applyEdits(working, edits);
    changed = true;
  }

  return {
    source: working,
    outcome: {
      changed,
      segments: { before: currentSegments.length, after: segmentsCount },
      rings: { before: currentRings.length, after: ringsCount },
    },
  };
}

/**
 * Resize the palettes inside the theme manifest at `manifestPath` in place.
 * No-op (no write) if the palettes already match the requested counts.
 */
export function resizeThemeManifestFile(
  manifestPath: string,
  segmentsCount: number,
  ringsCount: number,
): ResizeOutcome {
  const original = readFileSync(manifestPath, "utf8");
  const { source, outcome } = resizeThemeManifestPalettes(
    original,
    segmentsCount,
    ringsCount,
  );
  if (outcome.changed) {
    writeFileSync(manifestPath, source);
  }
  return outcome;
}
