import fs from "node:fs";
import path from "node:path";
import matter from "@11ty/gray-matter";
import { consola } from "consola";
import { z } from "zod";
import config from "../src/lib/config";

// ---------------------------------------------------------------------------
// Config-derived constants
// ---------------------------------------------------------------------------

const ringIds = config.rings.map((r) => r.id) as [string, ...string[]];
const segmentIds = config.segments.map((q) => q.id) as [string, ...string[]];

// ---------------------------------------------------------------------------
// Zod frontmatter schema — validates at parse boundary
// ---------------------------------------------------------------------------

const LinkSchema = z.object({
  url: z.string().url(),
  name: z.string().optional(),
});

export const FrontmatterSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  ogImage: z.string().optional(),
  ring: z.enum(ringIds),
  segment: z.enum(segmentIds),
  featured: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  teams: z.array(z.string()).default([]),
  links: z.array(LinkSchema).default([]),
});

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function parseRadarFrontmatter(
  data: Record<string, unknown>,
  filePath: string,
): Frontmatter | null {
  // Backward compatibility shim (ADR-0028)
  if (data.quadrant !== undefined && data.segment === undefined) {
    data.segment = data.quadrant;
    delete data.quadrant;
    consola.warn(
      `[deprecated] frontmatter key "quadrant" is renamed to "segment" in ${filePath}.`,
    );
  }

  const result = FrontmatterSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      consola.error(`${filePath}: ${issue.path.join(".")} — ${issue.message}`);
    }
    return null;
  }
  return result.data;
}

function collectMarkdownFiles(dirPath: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

export function validateRadarFiles(radarDir: string): number {
  const files = collectMarkdownFiles(radarDir);
  let errors = 0;

  for (const filePath of files) {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data } = matter(fileContent);
    const result = parseRadarFrontmatter(data, filePath);
    if (!result) {
      errors++;
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Standalone execution
// ---------------------------------------------------------------------------

function dataPath(...paths: string[]): string {
  return path.resolve("data", ...paths);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]).endsWith("validateFrontmatter.ts")
) {
  const radarDir = dataPath("radar");

  if (!fs.existsSync(radarDir)) {
    consola.fatal(`Radar directory not found: ${radarDir}`);
    process.exit(1);
  }

  const files = collectMarkdownFiles(radarDir);
  consola.start(`Validating ${files.length} radar file(s)…`);

  const errors = validateRadarFiles(radarDir);

  if (errors > 0) {
    consola.fatal(`${errors} file(s) had invalid frontmatter`);
    process.exit(1);
  }

  consola.success("All frontmatter is valid.");
}
