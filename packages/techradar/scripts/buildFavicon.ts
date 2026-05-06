/**
 * One-shot generator: rasterise public/favicon.svg into a multi-size .ico.
 *
 * Why this exists:
 *   - Modern browsers honour <link rel="icon" type="image/svg+xml">.
 *   - Legacy browsers (and Windows/macOS shortcut chrome) still want
 *     /favicon.ico. The .ico must contain real raster frames — pointing
 *     a .ico extension at SVG bytes does NOT work.
 *
 * Why we hand-roll the ICO container:
 *   - The repo already depends on @resvg/resvg-js (used by buildOgImages.ts)
 *     for SVG → PNG. Pulling in `png-to-ico` or `sharp` just to assemble a
 *     trivial 22-byte ICONDIR + per-frame ICONDIRENTRY would be net-new
 *     dependency surface for ~80 lines of bit-twiddling.
 *
 * When to run:
 *   - Regenerate after editing public/favicon.svg:
 *       pnpm --filter @porscheofficial/porschedigital-technology-radar \
 *         exec tsx scripts/buildFavicon.ts
 *   - The output public/favicon.ico is committed (unlike data/data.json,
 *     which is generated per build). Treat it like an asset.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { consola } from "consola";

const SVG_PATH = join(process.cwd(), "public", "favicon.svg");
const ICO_PATH = join(process.cwd(), "public", "favicon.ico");

// 16/32/48 are the three sizes Windows shell + browsers actually pick from.
// 64 is included for HiDPI tab thumbnails on some Linux DEs.
const SIZES = [16, 32, 48, 64] as const;

function renderPng(svg: Buffer, size: number): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0, 0, 0, 0)",
  });
  return Buffer.from(resvg.render().asPng());
}

/**
 * Build an ICO file from one or more PNG-encoded frames.
 *
 * ICO layout:
 *   ICONDIR        (6 bytes)       — header
 *   ICONDIRENTRY[] (16 bytes each) — one per frame, in declaration order
 *   <frame data>[] — PNG bytes for each frame, at the offset declared above
 *
 * Per-frame entry fields (little-endian):
 *   width, height : 1 byte each. 0 means 256 (we never hit that here).
 *   colorCount    : 0 (unused for PNG/true-color frames).
 *   reserved      : 0.
 *   planes        : 1 (PNG).
 *   bitCount      : 32 (RGBA).
 *   sizeInBytes   : length of this frame's PNG payload.
 *   fileOffset    : absolute offset into the .ico where this frame starts.
 */
function encodeIco(frames: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);

  const entries: Buffer[] = [];
  let dataOffset = 6 + frames.length * 16;

  for (const { size, png } of frames) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(dataOffset, 12);
    entries.push(entry);
    dataOffset += png.length;
  }

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

function main(): void {
  consola.start(`Generating favicon.ico from ${SVG_PATH}`);
  const svg = readFileSync(SVG_PATH);
  const frames = SIZES.map((size) => ({ size, png: renderPng(svg, size) }));
  const ico = encodeIco(frames);
  writeFileSync(ICO_PATH, ico);
  consola.success(
    `Wrote ${ICO_PATH} (${frames.length} frames: ${SIZES.join(", ")}px, ${ico.length} bytes)`,
  );
}

if (require.main === module) {
  main();
}
