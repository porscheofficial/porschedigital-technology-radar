import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import consola from "consola";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Taxonomy = "standard" | "custom" | "minimal";

export interface Ring {
  id: string;
  title: string;
  description: string;
  radius: number;
  strokeWidth: number;
}

export interface Segment {
  id: string;
  title: string;
  description: string;
}

export interface InitAnswers {
  /** `labels.title` in config.json */
  title: string;
  taxonomy: Taxonomy;
  rings: Ring[];
  segments: Segment[];
  /** Bundled theme ids to install. May be empty if a custom theme is the only one. */
  themes: string[];
  /** Custom theme to scaffold from `.example/`, or null. */
  customTheme: { slug: string; label: string } | null;
  /** `defaultTheme` in config.json (must reference an installed theme). */
  defaultTheme: string;
  /** Whether to seed `radar/` with starter blips. */
  examples: boolean;
}

export interface InitContext {
  cwd: string;
  sourceDir: string;
  /** True if BOTH config.json AND radar/ already exist. */
  isInitialized: boolean;
  /** True when prompts should run (TTY + not --yes). */
  interactive: boolean;
  /** Existing labels.title (from config.json) or null when fresh / unset. */
  existingTitle: string | null;
  /** Existing segments from config.json (parsed). */
  existingSegments: Segment[] | null;
  /** Existing rings from config.json (parsed). */
  existingRings: Ring[] | null;
  /** Existing defaultTheme from config.json. */
  existingDefaultTheme: string | null;
  /** Theme ids already installed under <cwd>/themes/. */
  existingThemes: string[];
  /** Bundled theme ids shipped with the framework (under data/themes, no dot-folders). */
  bundledThemes: string[];
  /** True when consumer already has any blip files. */
  hasRadarContent: boolean;
}

// ---------------------------------------------------------------------------
// Taxonomy presets
// ---------------------------------------------------------------------------

export const STANDARD_RINGS: Ring[] = [
  { id: "adopt", title: "Adopt", description: "", radius: 0.5, strokeWidth: 5 },
  {
    id: "trial",
    title: "Trial",
    description: "",
    radius: 0.69,
    strokeWidth: 3,
  },
  {
    id: "assess",
    title: "Assess",
    description: "",
    radius: 0.85,
    strokeWidth: 2,
  },
  { id: "hold", title: "Hold", description: "", radius: 1, strokeWidth: 0.75 },
];

export const STANDARD_SEGMENTS: Segment[] = [
  {
    id: "languages-and-frameworks",
    title: "Languages & Frameworks",
    description: "Programming languages and essential frameworks.",
  },
  {
    id: "methods-and-patterns",
    title: "Methods & Patterns",
    description: "Software development methods and design patterns.",
  },
  {
    id: "platforms-and-operations",
    title: "Platforms & Operations",
    description: "Technologies and tools for operating software at scale.",
  },
  {
    id: "tools",
    title: "Tools",
    description: "Productivity enhancers and project solutions.",
  },
];

export const MINIMAL_RINGS: Ring[] = [
  { id: "adopt", title: "Adopt", description: "", radius: 1, strokeWidth: 1 },
];

export const MINIMAL_SEGMENTS: Segment[] = [
  { id: "all", title: "All", description: "Everything tracked on the radar." },
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const SLUG_RE = /[^a-z0-9-]+/g;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(SLUG_RE, "")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function titleCase(input: string): string {
  return input
    .split(/[-\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Parse a comma-separated ring list (innermost → outermost) into Ring objects.
 * Distributes radii evenly across [0, 1]; outermost ring is always radius=1.
 */
export function parseRingsCsv(csv: string): Ring[] {
  const titles = csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (titles.length === 0) {
    throw new Error("At least one ring is required.");
  }
  const step = 1 / titles.length;
  return titles.map((title, idx) => ({
    id: slugify(title) || `ring-${idx + 1}`,
    title,
    description: "",
    radius: Number(((idx + 1) * step).toFixed(2)),
    strokeWidth: Math.max(0.75, 5 - idx),
  }));
}

export function parseSegmentsCsv(csv: string): Segment[] {
  const titles = csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (titles.length < 2 || titles.length > 6) {
    throw new Error("Segments must be between 2 and 6 entries.");
  }
  return titles.map((title, idx) => ({
    id: slugify(title) || `segment-${idx + 1}`,
    title,
    description: "",
  }));
}

// ---------------------------------------------------------------------------
// Context loading
// ---------------------------------------------------------------------------

interface ConfigShape {
  defaultTheme?: unknown;
  rings?: unknown;
  segments?: unknown;
  labels?: { title?: unknown };
}

function readConfigJson(cwd: string): ConfigShape | null {
  const p = join(cwd, "config.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as ConfigShape;
  } catch {
    return null;
  }
}

function listBundledThemes(sourceDir: string): string[] {
  const dir = join(sourceDir, "data", "themes");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

function listInstalledThemes(cwd: string): string[] {
  const dir = join(cwd, "themes");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

function hasAnyBlip(cwd: string): boolean {
  const radarDir = join(cwd, "radar");
  if (!existsSync(radarDir)) return false;
  for (const release of readdirSync(radarDir, { withFileTypes: true })) {
    if (!release.isDirectory()) continue;
    const releaseDir = join(radarDir, release.name);
    if (
      readdirSync(releaseDir).some(
        (f) => f.endsWith(".md") && f !== "README.md",
      )
    ) {
      return true;
    }
  }
  return false;
}

export function loadInitContext(opts: {
  cwd: string;
  sourceDir: string;
  interactive: boolean;
}): InitContext {
  const { cwd, sourceDir, interactive } = opts;
  const cfg = readConfigJson(cwd);
  const radarExists = existsSync(join(cwd, "radar"));
  const configExists = cfg !== null;

  const existingTitle =
    cfg && cfg.labels && typeof cfg.labels.title === "string"
      ? cfg.labels.title
      : null;

  const existingSegments =
    cfg && Array.isArray(cfg.segments) && cfg.segments.length > 0
      ? (cfg.segments as Segment[])
      : null;

  const existingRings =
    cfg && Array.isArray(cfg.rings) && cfg.rings.length > 0
      ? (cfg.rings as Ring[])
      : null;

  const existingDefaultTheme =
    cfg && typeof cfg.defaultTheme === "string" && cfg.defaultTheme.length > 0
      ? cfg.defaultTheme
      : null;

  return {
    cwd,
    sourceDir,
    isInitialized: configExists && radarExists,
    interactive,
    existingTitle,
    existingSegments,
    existingRings,
    existingDefaultTheme,
    existingThemes: listInstalledThemes(cwd),
    bundledThemes: listBundledThemes(sourceDir),
    hasRadarContent: hasAnyBlip(cwd),
  };
}

// ---------------------------------------------------------------------------
// Default answers (non-interactive / --yes path)
// ---------------------------------------------------------------------------

/**
 * Build a complete set of answers without prompting. Used in non-interactive
 * mode (`--yes`, no TTY, CI). Preserves any pre-existing config values.
 */
export function defaultAnswers(
  ctx: InitContext,
  basenameDir: string,
): InitAnswers {
  const title = ctx.existingTitle ?? titleCase(basenameDir) + " Tech Radar";

  const rings = ctx.existingRings ?? STANDARD_RINGS;
  const segments = ctx.existingSegments ?? STANDARD_SEGMENTS;
  const taxonomy: Taxonomy =
    ctx.existingRings === null && ctx.existingSegments === null
      ? "standard"
      : "custom";

  // Default: install ALL bundled themes (preserves current behavior).
  const themes = ctx.bundledThemes;
  const defaultTheme =
    ctx.existingDefaultTheme ??
    (themes.includes("neutral") ? "neutral" : (themes[0] ?? "neutral"));

  return {
    title,
    taxonomy,
    rings,
    segments,
    themes,
    customTheme: null,
    defaultTheme,
    examples: !ctx.hasRadarContent,
  };
}

// ---------------------------------------------------------------------------
// Interactive prompt flow
// ---------------------------------------------------------------------------

/**
 * Drive the user through the 7-prompt onboarding flow when interactive,
 * otherwise return `defaultAnswers(ctx)`. Prompts are skipped individually
 * when the corresponding piece of config already exists on disk (gap-fill
 * mode for post-upgrade re-runs).
 */
export async function collectAnswers(
  ctx: InitContext,
  basenameDir: string,
): Promise<InitAnswers> {
  const defaults = defaultAnswers(ctx, basenameDir);

  if (!ctx.interactive) return defaults;

  const title = await promptTitle(ctx, defaults);
  const shape = await promptTaxonomyAndShape(ctx, defaults);
  const themes = await promptThemes(ctx, defaults);
  const customTheme = await promptCustomTheme(ctx, themes);
  const defaultTheme = await resolveDefaultTheme(
    ctx,
    themes,
    customTheme,
    defaults,
  );
  const examples = await promptExamples(ctx);

  const answers: InitAnswers = {
    title,
    taxonomy: shape.taxonomy,
    rings: shape.rings,
    segments: shape.segments,
    themes,
    customTheme,
    defaultTheme,
    examples,
  };

  printSummary(answers);
  const ok = await consola.prompt("Proceed?", {
    type: "confirm",
    initial: true,
  });
  if (ok !== true) {
    consola.info("Aborted by user.");
    process.exit(0);
  }

  return answers;
}

async function promptTitle(
  ctx: InitContext,
  defaults: InitAnswers,
): Promise<string> {
  if (ctx.existingTitle !== null) return defaults.title;
  const answer = await consola.prompt("Radar title:", {
    type: "text",
    default: defaults.title,
    placeholder: defaults.title,
  });
  if (typeof answer === "string" && answer.trim().length > 0) {
    return answer.trim();
  }
  return defaults.title;
}

async function promptTaxonomyAndShape(
  ctx: InitContext,
  defaults: InitAnswers,
): Promise<{ taxonomy: Taxonomy; rings: Ring[]; segments: Segment[] }> {
  if (ctx.existingRings !== null || ctx.existingSegments !== null) {
    return {
      taxonomy: defaults.taxonomy,
      rings: defaults.rings,
      segments: defaults.segments,
    };
  }

  const picked = await consola.prompt("Pick a starting taxonomy:", {
    type: "select",
    options: [
      {
        label: "Standard (4 rings × 4 segments — recommended)",
        value: "standard",
      },
      { label: "Custom (define your own)", value: "custom" },
      { label: "Minimal (1 ring × 1 segment — sandbox)", value: "minimal" },
    ],
    initial: "standard",
  });
  const taxonomy: Taxonomy = (String(picked) as Taxonomy) ?? "standard";

  if (taxonomy === "custom") {
    const ringsRaw = await consola.prompt(
      "Rings, innermost → outermost (comma-separated):",
      {
        type: "text",
        default: "Adopt, Trial, Assess, Hold",
        placeholder: "Adopt, Trial, Assess, Hold",
      },
    );
    const rings = parseRingsCsv(String(ringsRaw));
    const segRaw = await consola.prompt("Segments (2–6, comma-separated):", {
      type: "text",
      default: "Languages, Frameworks, Tools, Platforms",
      placeholder: "Languages, Frameworks, Tools, Platforms",
    });
    const segments = parseSegmentsCsv(String(segRaw));
    return { taxonomy, rings, segments };
  }

  if (taxonomy === "minimal") {
    return { taxonomy, rings: MINIMAL_RINGS, segments: MINIMAL_SEGMENTS };
  }

  return { taxonomy, rings: STANDARD_RINGS, segments: STANDARD_SEGMENTS };
}

async function promptThemes(
  ctx: InitContext,
  defaults: InitAnswers,
): Promise<string[]> {
  const installable = ctx.bundledThemes.filter(
    (id) => !ctx.existingThemes.includes(id),
  );
  if (installable.length === 0) return defaults.themes;

  const picked = await consola.prompt(
    `Which themes to install? (space toggles, enter confirms)`,
    {
      type: "multiselect",
      options: installable.map((id) => ({
        label: id,
        value: id,
        hint: id === "neutral" ? "good starter default" : undefined,
      })),
      initial: installable.includes("neutral") ? ["neutral"] : [installable[0]],
      required: false,
    } as Parameters<typeof consola.prompt>[1],
  );
  const arr = Array.isArray(picked) ? (picked as string[]) : [];
  return [...ctx.existingThemes, ...arr];
}

async function promptCustomTheme(
  ctx: InitContext,
  themes: string[],
): Promise<InitAnswers["customTheme"]> {
  const wantCustom = await consola.prompt("Set up your own custom theme?", {
    type: "confirm",
    initial: false,
  });
  if (wantCustom !== true) return null;

  const slugRaw = await consola.prompt(
    "Custom theme id (URL-safe slug, e.g. 'acme'):",
    { type: "text", placeholder: "acme" },
  );
  const slug = slugify(String(slugRaw ?? ""));
  if (slug.length === 0) {
    consola.warn("Empty slug — skipping custom theme.");
    return null;
  }
  if (ctx.existingThemes.includes(slug) || themes.includes(slug)) {
    consola.warn(`Theme "${slug}" already exists — skipping custom theme.`);
    return null;
  }

  const label = await consola.prompt("Custom theme label:", {
    type: "text",
    default: titleCase(slug),
  });
  return {
    slug,
    label:
      typeof label === "string" && label.trim()
        ? label.trim()
        : titleCase(slug),
  };
}

async function resolveDefaultTheme(
  ctx: InitContext,
  themes: string[],
  customTheme: InitAnswers["customTheme"],
  defaults: InitAnswers,
): Promise<string> {
  if (ctx.existingDefaultTheme !== null) return ctx.existingDefaultTheme;
  if (customTheme !== null) return customTheme.slug;
  if (themes.length === 1) return themes[0];
  if (themes.length === 0) return defaults.defaultTheme;

  const picked = await consola.prompt("Which theme should be the default?", {
    type: "select",
    options: themes.map((id) => ({ label: id, value: id })),
    initial: themes.includes("neutral") ? "neutral" : themes[0],
  });
  if (typeof picked === "string" && picked.length > 0) return picked;
  return defaults.defaultTheme;
}

async function promptExamples(ctx: InitContext): Promise<boolean> {
  if (ctx.hasRadarContent) return false;
  const want = await consola.prompt(
    "Include example entries so the radar isn't empty on first run?",
    { type: "confirm", initial: true },
  );
  return want === true;
}

function printSummary(a: InitAnswers): void {
  const themesLabel = a.themes.length > 0 ? a.themes.join(", ") : "(none)";
  const customLabel = a.customTheme
    ? `${a.customTheme.slug} (${a.customTheme.label})`
    : "no";
  consola.box(
    [
      `Title:           ${a.title}`,
      `Taxonomy:        ${a.taxonomy}`,
      `Rings:           ${a.rings.map((r) => r.title).join(", ")}`,
      `Segments:        ${a.segments.map((s) => s.title).join(", ")}`,
      `Themes:          ${themesLabel}`,
      `Custom theme:    ${customLabel}`,
      `Default theme:   ${a.defaultTheme}`,
      `Example entries: ${a.examples ? "yes" : "no"}`,
    ].join("\n"),
  );
}

// ---------------------------------------------------------------------------
// Config patch generation
// ---------------------------------------------------------------------------

/**
 * Build the JSON object to write to <cwd>/config.json. Only fields that
 * differ from the bundled defaults are included, mirroring the existing
 * "minimal overlay" convention in data/config.json today.
 */
export function buildConfigJson(answers: InitAnswers): Record<string, unknown> {
  const out: Record<string, unknown> = {
    defaultTheme: answers.defaultTheme,
    labels: { title: answers.title },
  };
  // Only write rings/segments when the user picked custom or minimal.
  if (answers.taxonomy !== "standard") {
    out.rings = answers.rings;
    out.segments = answers.segments;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Starter blip generation
// ---------------------------------------------------------------------------

const FRONTMATTER_HINT = `<!--
This is a placeholder blip — feel free to edit, rename the file, or delete.
See the README for the full frontmatter schema.
-->`;

export function todayRelease(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface StarterFile {
  /** Relative path inside <cwd>/radar/. */
  path: string;
  content: string;
}

/**
 * Generate the starter content for <cwd>/radar/ based on the user's taxonomy
 * + examples choice. Returns the files to write. Curated content (Standard
 * taxonomy + examples=yes) is handled by the caller via cpSync — for that
 * case this function returns an empty array.
 */
export function generateStarterBlips(answers: InitAnswers): StarterFile[] {
  if (!answers.examples) {
    return [
      {
        path: "README.md",
        content: emptyRadarReadme(answers),
      },
    ];
  }

  if (answers.taxonomy === "standard") {
    // Caller is expected to copy the curated `data/radar/` tree from the
    // installed package. Nothing to generate here.
    return [];
  }

  const release = todayRelease();

  if (answers.taxonomy === "minimal") {
    const ring = answers.rings[0];
    const segment = answers.segments[0];
    return [
      {
        path: `${release}/welcome.md`,
        content: blipBody({
          title: "Welcome to your radar",
          ring: ring.id,
          segment: segment.id,
        }),
      },
    ];
  }

  // Custom taxonomy — one blip per segment, cycling rings.
  const out: StarterFile[] = [];
  for (let i = 0; i < answers.segments.length; i++) {
    const seg = answers.segments[i];
    const ring = answers.rings[i % answers.rings.length];
    out.push({
      path: `${release}/${seg.id}-example.md`,
      content: blipBody({
        title: `Example: ${seg.title}`,
        ring: ring.id,
        segment: seg.id,
      }),
    });
  }
  return out;
}

function blipBody(opts: {
  title: string;
  ring: string;
  segment: string;
}): string {
  return [
    "---",
    `title: "${opts.title}"`,
    `ring: ${opts.ring}`,
    `segment: ${opts.segment}`,
    "---",
    FRONTMATTER_HINT,
    "",
    "Replace this body with a short summary of the technology, why it sits in",
    "this ring, and any links worth keeping next to it.",
    "",
  ].join("\n");
}

function emptyRadarReadme(answers: InitAnswers): string {
  const ringIds = answers.rings.map((r) => r.id).join(" | ");
  const segIds = answers.segments.map((s) => s.id).join(" | ");
  return [
    "# Radar entries",
    "",
    "Each blip is a markdown file under `radar/<release-date>/<id>.md`.",
    "",
    "## Minimum frontmatter",
    "",
    "```yaml",
    "---",
    'title: "My technology"',
    `ring: <one of: ${ringIds}>`,
    `segment: <one of: ${segIds}>`,
    "---",
    "Free-form markdown body goes here.",
    "```",
    "",
    "Run `npx techradar validate` after editing to check the schema.",
    "",
  ].join("\n");
}
