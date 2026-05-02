/**
 * Browser-only helper that exports the radar as a downloadable PNG.
 *
 * Approach: clone the inner <svg>, copy CSS-Module-derived computed styles
 * (opacity, fill-opacity, font-family, …) onto each cloned node, append any
 * persistent tooltip overlays as native SVG <g> nodes, serialize the result,
 * load it into an <img>, and draw it onto a 2x canvas. This avoids the
 * foreignObject-based libraries that mangle inline SVG gradients and reflow
 * SVG-namespaced <a> blips as HTML overlays.
 *
 * Returns a promise that resolves to `true` on success, `false` if the radar
 * is not mounted or rasterization fails.
 */

const RADAR_SELECTOR = '[role="img"][aria-label="Technology radar"]';
const DOWNLOAD_FILENAME = "technology-radar.png";
const SVG_NS = "http://www.w3.org/2000/svg";
const PIXEL_RATIO = 2;

const STYLE_PROPS_TO_INLINE = [
  "opacity",
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "visibility",
  "display",
  "text-decoration",
  "text-transform",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
] as const;

function inlineComputedStyles(original: Element, clone: Element): void {
  const originals = Array.from(original.querySelectorAll<Element>("*"));
  const clones = Array.from(clone.querySelectorAll<Element>("*"));
  const pairs: [Element, Element][] = [[original, clone]];
  for (let i = 0; i < originals.length; i++) {
    const o = originals[i];
    const c = clones[i];
    if (o && c) pairs.push([o, c]);
  }
  for (const [o, c] of pairs) {
    const cs = window.getComputedStyle(o);
    const target = c as SVGElement | HTMLElement;
    for (const prop of STYLE_PROPS_TO_INLINE) {
      const val = cs.getPropertyValue(prop);
      if (val) target.style.setProperty(prop, val);
    }
  }
}

interface TooltipOverlay {
  cx: number;
  cy: number;
  text: string;
  color: string;
  fontFamily: string;
}

function collectTooltipOverlays(
  radarDiv: HTMLElement,
  svgRect: DOMRect,
  scale: number,
): TooltipOverlay[] {
  const overlays: TooltipOverlay[] = [];
  const nodes = radarDiv.querySelectorAll<HTMLElement>(
    ":scope > a[data-item-id]",
  );
  for (const node of nodes) {
    const cs = window.getComputedStyle(node);
    const opacity = Number.parseFloat(cs.opacity);
    if (!Number.isFinite(opacity) || opacity < 0.5) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cssCx = rect.left + rect.width / 2 - svgRect.left;
    const cssCy = rect.top + rect.height / 2 - svgRect.top;
    overlays.push({
      cx: cssCx * scale,
      cy: cssCy * scale,
      text: (node.textContent ?? "").trim(),
      color:
        node.style.getPropertyValue("--tooltip").trim() ||
        cs.backgroundColor ||
        "#000",
      fontFamily: cs.fontFamily || "sans-serif",
    });
  }
  return overlays;
}

function appendTooltipNodes(
  svg: SVGSVGElement,
  overlays: TooltipOverlay[],
  scale: number,
): void {
  // SVG text width can't be measured pre-render, so estimate from char count
  // using a typical glyph aspect ratio. Padding keeps the pill readable.
  const fontSize = 14 * scale;
  const padX = 10 * scale;
  const padY = 5 * scale;
  const radius = 4 * scale;
  const glyphRatio = 0.55;
  for (const o of overlays) {
    const textWidth = Math.max(o.text.length * fontSize * glyphRatio, fontSize);
    const rectW = textWidth + padX * 2;
    const rectH = fontSize + padY * 2;
    const g = document.createElementNS(SVG_NS, "g");
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(o.cx - rectW / 2));
    rect.setAttribute("y", String(o.cy - rectH / 2));
    rect.setAttribute("width", String(rectW));
    rect.setAttribute("height", String(rectH));
    rect.setAttribute("rx", String(radius));
    rect.setAttribute("ry", String(radius));
    rect.setAttribute("fill", o.color);
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(o.cx));
    text.setAttribute("y", String(o.cy));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("fill", "#ffffff");
    text.setAttribute("font-size", String(fontSize));
    text.setAttribute("font-family", o.fontFamily);
    text.setAttribute("font-weight", "600");
    text.textContent = o.text;
    g.appendChild(rect);
    const arrowHalf = 8 * scale;
    const arrowH = 8 * scale;
    const baseY = o.cy + rectH / 2;
    const arrow = document.createElementNS(SVG_NS, "polygon");
    arrow.setAttribute(
      "points",
      `${o.cx - arrowHalf},${baseY} ${o.cx + arrowHalf},${baseY} ${o.cx},${baseY + arrowH}`,
    );
    arrow.setAttribute("fill", o.color);
    g.appendChild(arrow);
    g.appendChild(text);
    svg.appendChild(g);
  }
}

function rasterizeSvg(
  svgMarkup: string,
  width: number,
  height: number,
  backgroundColor: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgMarkup], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("canvas 2d context unavailable"));
          return;
        }
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg rasterization failed"));
    };
    img.src = url;
  });
}

function triggerDownload(dataUrl: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

// Walks ancestors looking for the first non-transparent background colour, so
// the rasterized PNG matches the page chrome the user is actually viewing
// (light theme, dark theme, or any future themed surface).
function resolveBackgroundColor(start: HTMLElement): string {
  let node: HTMLElement | null = start;
  while (node) {
    const bg = window.getComputedStyle(node).backgroundColor;
    if (bg && bg !== "transparent" && !/rgba?\(.*,\s*0\s*\)$/.test(bg)) {
      return bg;
    }
    node = node.parentElement;
  }
  return "#ffffff";
}

// SVGs loaded via <img src=blob:> render in an isolated context that, in most
// browsers, refuses to fetch external font files even when @font-face rules
// are inlined. The reliable workaround is to fetch each font binary, base64
// encode it, and rewrite its @font-face src to a data: URL so it travels
// inside the SVG itself. We only inline Latin-range variants — radar labels
// are English; pulling in Arabic/Cyrillic/Greek/Pashto/Thai/Urdu woff2s would
// add ~1MB to every export.
async function injectFontFaces(svg: SVGSVGElement): Promise<void> {
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let cssRules: CSSRuleList | null = null;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue;
    }
    if (!cssRules) continue;
    for (const rule of Array.from(cssRules)) {
      if (rule instanceof CSSFontFaceRule) rules.push(rule.cssText);
    }
  }
  if (rules.length === 0) return;
  let combined = rules.join("\n");
  const urlPattern = /url\(['"]?(https?:\/\/[^'")]+)['"]?\)/g;
  const urls = new Set<string>();
  for (const m of combined.matchAll(urlPattern)) {
    if (m[1].includes("-latin-")) urls.add(m[1]);
  }
  await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const buf = await res.arrayBuffer();
        const dataUrl = `data:font/woff2;base64,${arrayBufferToBase64(buf)}`;
        combined = combined.split(url).join(dataUrl);
      } catch {
        // Network failure / CORS — leave URL as-is and accept fallback font.
      }
    }),
  );
  const style = document.createElementNS(SVG_NS, "style");
  style.textContent = combined;
  svg.insertBefore(style, svg.firstChild);
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function exportRadarImage(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const radarDiv = document.querySelector<HTMLElement>(RADAR_SELECTOR);
  if (!radarDiv) return false;
  const svg = radarDiv.querySelector<SVGSVGElement>("svg");
  if (!svg) return false;
  try {
    const svgRect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const viewBoxWidth = viewBox.width || svgRect.width || 1;
    const viewBoxHeight = viewBox.height || svgRect.height || viewBoxWidth;
    const scale = svgRect.width > 0 ? viewBoxWidth / svgRect.width : 1;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", SVG_NS);
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    inlineComputedStyles(svg, clone);
    await injectFontFaces(clone);
    const overlays = collectTooltipOverlays(radarDiv, svgRect, scale);
    appendTooltipNodes(clone, overlays, scale);
    const markup = new XMLSerializer().serializeToString(clone);
    const outW = Math.round(viewBoxWidth * PIXEL_RATIO);
    const outH = Math.round(viewBoxHeight * PIXEL_RATIO);
    const dataUrl = await rasterizeSvg(
      markup,
      outW,
      outH,
      resolveBackgroundColor(radarDiv),
    );
    triggerDownload(dataUrl, DOWNLOAD_FILENAME);
    return true;
  } catch {
    return false;
  }
}
