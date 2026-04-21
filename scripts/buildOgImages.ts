import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { consola } from "consola";
import React from "react";
import satori from "satori";

import type { Item } from "@/lib/types";
import config from "../src/lib/config";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_OUTPUT_DIR = path.resolve("public", "og");
const OG_CACHE_PATH = path.join(OG_OUTPUT_DIR, ".og-cache.json");
const DATA_PATH = path.resolve("data", "data.json");
const TEMPLATE_VERSION = 1;
const SITE_BRAND = "Porsche Digital Tech Radar";
const FONT_DIR = path.resolve("node_modules", "@fontsource", "inter", "files");

const interRegularBuffer = fs.readFileSync(
  path.join(FONT_DIR, "inter-latin-400-normal.woff"),
);
const interBoldBuffer = fs.readFileSync(
  path.join(FONT_DIR, "inter-latin-700-normal.woff"),
);

type OgCache = Record<string, string>;

interface OgDataFile {
  items: Item[];
}

type OgQuadrant = {
  id: string;
  title: string;
  color: string;
};

type OgRing = {
  id: string;
  title: string;
  color: string;
};

interface ItemOgContext {
  item: Item;
  quadrant: OgQuadrant;
  ring: OgRing;
}

interface DefaultOgContext {
  title: string;
  tagline: string;
}

export interface ItemOgCacheInput {
  title: string;
  ring: OgRing;
  quadrant: OgQuadrant;
  ogImage?: string;
  templateVersion?: number;
}

function getBackgroundColor() {
  return config.colors.background || "#0E0E12";
}

function getContentColor() {
  return config.colors.content || "#AFB0B3";
}

function getTextColor() {
  return config.colors.foreground || "#FBFCFF";
}

function loadDataFile(): OgDataFile {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(
      "data/data.json not found. Run `pnpm run build:data` first.",
    );
  }

  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as OgDataFile;
}

function loadCache(): OgCache {
  if (!fs.existsSync(OG_CACHE_PATH)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(OG_CACHE_PATH, "utf8")) as OgCache;
}

function saveCache(cache: OgCache) {
  ensureDirectory(OG_OUTPUT_DIR);
  fs.writeFileSync(OG_CACHE_PATH, JSON.stringify(cache, null, 2));
}

function ensureDirectory(directoryPath: string) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

export function isAbsoluteUrl(value: string | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export function isCustomOgImage(value: string | undefined): value is string {
  return Boolean(value) && !isAbsoluteUrl(value);
}

function createOgRoot(children: React.ReactNode) {
  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        width: `${OG_WIDTH}px`,
        height: `${OG_HEIGHT}px`,
        background: getBackgroundColor(),
        color: getTextColor(),
        fontFamily: "Inter",
        position: "relative",
      },
    },
    children,
  );
}

function createItemOgMarkup({ item, quadrant, ring }: ItemOgContext) {
  return createOgRoot([
    React.createElement("div", {
      key: "band",
      style: {
        width: "24px",
        height: "100%",
        background: quadrant.color,
      },
    }),
    React.createElement(
      "div",
      {
        key: "content",
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          padding: "56px 64px 48px 56px",
        },
      },
      [
        React.createElement(
          "div",
          {
            key: "header",
            style: {
              display: "flex",
              justifyContent: "flex-end",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                background: ring.color,
                borderRadius: "999px",
                color: "#0A0A0A",
                fontSize: "24px",
                fontWeight: 700,
                padding: "12px 22px",
              },
            },
            ring.title,
          ),
        ),
        React.createElement(
          "div",
          {
            key: "body",
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              maxWidth: "920px",
            },
          },
          [
            React.createElement(
              "div",
              {
                key: "title",
                style: {
                  fontSize: "56px",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  maxHeight: "124px",
                  overflow: "hidden",
                },
              },
              item.title.length > 72
                ? `${item.title.slice(0, 72).trimEnd()}…`
                : item.title,
            ),
            React.createElement(
              "div",
              {
                key: "subtitle",
                style: {
                  fontSize: "28px",
                  fontWeight: 400,
                  color: getContentColor(),
                },
              },
              `${ring.title} · ${quadrant.title}`,
            ),
          ],
        ),
        React.createElement(
          "div",
          {
            key: "footer",
            style: {
              display: "flex",
              justifyContent: "flex-end",
              fontSize: "22px",
              fontWeight: 400,
              color: getContentColor(),
            },
          },
          SITE_BRAND,
        ),
      ],
    ),
  ]);
}

function createDefaultOgMarkup({ title, tagline }: DefaultOgContext) {
  return createOgRoot(
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          padding: "64px",
          background:
            "linear-gradient(135deg, rgba(74,158,126,0.18), rgba(14,14,18,0) 50%)",
        },
      },
      [
        React.createElement(
          "div",
          {
            key: "heading",
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              marginTop: "80px",
            },
          },
          [
            React.createElement(
              "div",
              {
                key: "title",
                style: {
                  fontSize: "72px",
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: "-0.04em",
                  maxWidth: "860px",
                },
              },
              title,
            ),
            React.createElement(
              "div",
              {
                key: "tagline",
                style: {
                  fontSize: "30px",
                  fontWeight: 400,
                  color: getContentColor(),
                  maxWidth: "760px",
                },
              },
              tagline,
            ),
          ],
        ),
        React.createElement(
          "div",
          {
            key: "footer",
            style: {
              display: "flex",
              justifyContent: "flex-end",
              fontSize: "22px",
              fontWeight: 400,
              color: getContentColor(),
            },
          },
          SITE_BRAND,
        ),
      ],
    ),
  );
}

async function renderPng(markup: React.ReactNode) {
  const svg = await satori(markup, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      {
        name: "Inter",
        data: interRegularBuffer,
        weight: 400,
        style: "normal",
      },
      {
        name: "Inter",
        data: interBoldBuffer,
        weight: 700,
        style: "normal",
      },
    ],
  });

  return Buffer.from(new Resvg(svg).render().asPng());
}

export async function renderItemOgImagePng(context: ItemOgContext) {
  return renderPng(createItemOgMarkup(context));
}

export async function renderDefaultOgImagePng(context: DefaultOgContext) {
  return renderPng(createDefaultOgMarkup(context));
}

export function createItemOgCacheHash({
  title,
  ring,
  quadrant,
  ogImage,
  templateVersion = TEMPLATE_VERSION,
}: ItemOgCacheInput) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title,
        ring,
        quadrant,
        ogImage,
        templateVersion,
      }),
    )
    .digest("hex");
}

function createDefaultOgCacheHash(title: string, tagline: string) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title,
        tagline,
        templateVersion: TEMPLATE_VERSION,
      }),
    )
    .digest("hex");
}

export function writeOgImage(outputPath: string, pngBuffer: Buffer) {
  ensureDirectory(path.dirname(outputPath));
  fs.writeFileSync(outputPath, pngBuffer);
}

async function buildDefaultImage(cache: OgCache) {
  const cacheKey = "default";
  const outputPath = path.join(OG_OUTPUT_DIR, "default.png");
  const title = SITE_BRAND;
  const tagline = config.labels.title || "Technology Radar";
  const hash = createDefaultOgCacheHash(title, tagline);

  if (cache[cacheKey] === hash && fs.existsSync(outputPath)) {
    return false;
  }

  const pngBuffer = await renderDefaultOgImagePng({ title, tagline });
  writeOgImage(outputPath, pngBuffer);
  cache[cacheKey] = hash;
  return true;
}

async function buildItemImage(context: ItemOgContext, cache: OgCache) {
  const cacheKey = `${context.quadrant.id}/${context.item.id}`;
  const outputPath = path.join(
    OG_OUTPUT_DIR,
    context.quadrant.id,
    `${context.item.id}.png`,
  );
  const hash = createItemOgCacheHash({
    title: context.item.title,
    ring: {
      id: context.ring.id,
      title: context.ring.title,
      color: context.ring.color,
    },
    quadrant: {
      id: context.quadrant.id,
      title: context.quadrant.title,
      color: context.quadrant.color,
    },
    ogImage: context.item.ogImage,
  });

  if (cache[cacheKey] === hash && fs.existsSync(outputPath)) {
    return false;
  }

  const pngBuffer = await renderItemOgImagePng(context);
  writeOgImage(outputPath, pngBuffer);
  cache[cacheKey] = hash;
  return true;
}

export async function buildOgImages() {
  const data = loadDataFile();
  const quadrantById = new Map(
    config.quadrants.map((quadrant) => [quadrant.id, quadrant]),
  );
  const ringById = new Map(config.rings.map((ring) => [ring.id, ring]));
  const cache = loadCache();

  let generated = 0;
  let skipped = 0;

  if (await buildDefaultImage(cache)) {
    generated += 1;
  } else {
    skipped += 1;
  }

  for (const item of data.items) {
    if (isAbsoluteUrl(item.ogImage) || isCustomOgImage(item.ogImage)) {
      skipped += 1;
      continue;
    }

    const quadrant = quadrantById.get(item.quadrant);
    const ring = ringById.get(item.ring);

    if (!quadrant || !ring) {
      throw new Error(
        `Missing config for item ${item.id} (${item.quadrant}/${item.ring})`,
      );
    }

    if (await buildItemImage({ item, quadrant, ring }, cache)) {
      generated += 1;
    } else {
      skipped += 1;
    }
  }

  saveCache(cache);

  return { generated, skipped };
}

export async function main() {
  consola.start("Building Open Graph images...");
  const startTime = performance.now();
  const { generated, skipped } = await buildOgImages();
  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

  consola.success(
    `Built ${generated} Open Graph image(s), skipped ${skipped} unchanged/custom entries (${elapsed}s)`,
  );
  consola.info(`Output: ${path.relative(process.cwd(), OG_OUTPUT_DIR)}`);
}

if (require.main === module) {
  main().catch((err) => {
    consola.error(err);
    process.exit(1);
  });
}
