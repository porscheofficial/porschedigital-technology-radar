// recordDemo.ts — generate the animated WebP shown in the repo README.
//
// Reproducible recording of the live UI. The script boots a static file
// server against the already-built `out/` directory, drives a headless
// Chromium through a declarative scene list with Playwright, captures a
// WebM via Playwright's recordVideo, then assembles the animated WebP from
// PNG frames using ffmpeg (frame extraction) and img2webp from libwebp
// (animation muxing).
//
// Two overlays are injected client-side via addInitScript so they survive
// navigation and reload:
//
//   1. A synthetic cursor — Playwright's recordVideo does NOT render the
//      real mouse pointer, so without this every interaction looks like the
//      page is operating itself. The overlay is a DOM element animated via
//      CSS transitions; its position is driven from the recorder, and the
//      real Playwright mouse/click events still fire on the underlying
//      elements (they just happen to align spatially).
//
//   2. A small caption chyron at the bottom-left, deliberately low-key so
//      the product breathes through.
//
// Determinism levers:
// - Fixed viewport, deviceScaleFactor, locale, timezone, colorScheme.
// - All routes navigated via absolute URLs against a known port.
// - Animations are not disabled — theme/mode transitions are the point.
// - Output lives at `docs/media/demo.webp` and is committed.
//
// Prerequisites:
// - `pnpm --filter @porscheofficial/porschedigital-technology-radar run build`
//   must have produced `out/` (the project's default `output: "export"`).
// - System binaries `ffmpeg` and `img2webp` on PATH. macOS:
//   `brew install ffmpeg webp`. These are deliberately NOT npm dependencies
//   — see ADR-0006/0011 precedent for `osv-scanner` / `trufflehog`.

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { consola } from "consola";
import { chromium, type Locator, type Page } from "playwright";

const execFileAsync = promisify(execFile);
const FRAME_RATE = 12;
const FRAME_DURATION_MS = Math.round(1000 / FRAME_RATE);
const TARGET_WIDTH = 800;
const WEBP_QUALITY = 70;

const PORT = 4319;
const HOST = `http://127.0.0.1:${PORT}`;
const VIEWPORT = { width: 1440, height: 1040 } as const;

// Injected via addInitScript. Provides:
//   window.__demoCursorSet(x, y)   — animate cursor to viewport coords
//   window.__demoCursorShow(bool)  — fade cursor in/out
//   window.__demoCursorPulse()     — click ripple animation
//   window.__demoCaption(text)     — show / hide caption (empty = hide)
//
// The cursor itself is purely cosmetic — Playwright's own mouse events are
// what drive the underlying elements. We just animate a DOM overlay to
// follow along so viewers can see intent.
const OVERLAY_INIT_SCRIPT = `
(() => {
  try {
    localStorage.setItem("radar-disclaimer-dismissed", "1");
  } catch {}

  const CURSOR_ID = "__demo_cursor__";
  const CAPTION_ID = "__demo_caption__";
  const STYLE_ID = "__demo_overlay_styles__";

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "#" + CURSOR_ID + " {",
      "  position: fixed; left: 0; top: 0;",
      "  width: 22px; height: 22px; margin: -11px 0 0 -11px;",
      "  border-radius: 50%;",
      "  background: radial-gradient(circle at 35% 32%, #ffffff 0%, #f4f6fb 55%, #d3dae5 100%);",
      "  box-shadow: 0 6px 18px rgba(0,0,0,0.42), 0 0 0 1.5px rgba(0,0,0,0.28);",
      "  pointer-events: none; z-index: 2147483647;",
      "  opacity: 0;",
      "  transform: translate3d(0,0,0);",
      "  transition: opacity 260ms ease, transform 720ms cubic-bezier(.22,.61,.36,1);",
      "  will-change: transform;",
      "}",
      "#" + CURSOR_ID + ".visible { opacity: 1; }",
      "#" + CURSOR_ID + "::after {",
      "  content: \\"\\"; position: absolute; inset: -8px;",
      "  border-radius: 50%; border: 2px solid rgba(255,255,255,0.55);",
      "  opacity: 0; transform: scale(0.55);",
      "  transition: opacity 360ms ease, transform 360ms cubic-bezier(.22,.61,.36,1);",
      "}",
      "#" + CURSOR_ID + ".clicking::after {",
      "  opacity: 1; transform: scale(1.85);",
      "  transition: opacity 0ms, transform 0ms;",
      "}",
      "#" + CAPTION_ID + " {",
      "  position: fixed; left: 36px; bottom: 36px;",
      "  padding: 10px 18px; border-radius: 999px;",
      "  background: rgba(15,15,20,0.78); color: #fff;",
      "  font: 500 16px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif;",
      "  letter-spacing: 0.01em;",
      "  border: 1px solid rgba(255,255,255,0.08);",
      "  box-shadow: 0 10px 28px rgba(0,0,0,0.36);",
      "  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);",
      "  pointer-events: none; max-width: 70vw;",
      "  opacity: 0; transform: translateY(8px);",
      "  transition: opacity 260ms ease, transform 260ms ease;",
      "  z-index: 2147483646;",
      "}",
      "#" + CAPTION_ID + ".visible { opacity: 1; transform: translateY(0); }",
    ].join("\\n");
    document.head.appendChild(style);
  };

  const ensureCursor = () => {
    let el = document.getElementById(CURSOR_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = CURSOR_ID;
      document.body.appendChild(el);
    }
    return el;
  };

  const ensureCaption = () => {
    let el = document.getElementById(CAPTION_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = CAPTION_ID;
      document.body.appendChild(el);
    }
    return el;
  };

  // Public API entry points are wrapped in apply() so styles + DOM nodes
  // are guaranteed before the first call, even if the recorder evaluates
  // an overlay function in the narrow window between addInitScript and
  // DOMContentLoaded firing.
  const apply = () => {
    ensureStyle();
    ensureCursor();
    ensureCaption();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }

  window.__demoCursorSet = (x, y) => {
    apply();
    const el = ensureCursor();
    el.style.transform = "translate3d(" + x + "px, " + y + "px, 0)";
  };
  window.__demoCursorShow = (show) => {
    apply();
    ensureCursor().classList.toggle("visible", !!show);
  };
  window.__demoCursorPulse = () => {
    apply();
    const el = ensureCursor();
    el.classList.remove("clicking");
    void el.offsetWidth;
    el.classList.add("clicking");
    setTimeout(() => el.classList.remove("clicking"), 360);
  };
  window.__demoCaption = (text) => {
    apply();
    const el = ensureCaption();
    if (!text) {
      el.classList.remove("visible");
      return;
    }
    el.textContent = text;
    el.classList.add("visible");
  };
})();
`;

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");
const OUT_DIR = path.join(PACKAGE_ROOT, "out");
const TARGET_DIR = path.join(REPO_ROOT, "docs", "media");
const TARGET_FILE = path.join(TARGET_DIR, "demo.webp");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

interface DemoWindow {
  __demoCursorSet?: (x: number, y: number) => void;
  __demoCursorShow?: (show: boolean) => void;
  __demoCursorPulse?: () => void;
  __demoCaption?: (text: string) => void;
}

interface SceneContext {
  page: Page;
}

interface Scene {
  description: string;
  run: (ctx: SceneContext) => Promise<void>;
}

// --- overlay helpers -------------------------------------------------------

async function setCaption(page: Page, text: string): Promise<void> {
  await page.evaluate((t) => {
    (window as unknown as DemoWindow).__demoCaption?.(t);
  }, text);
}

async function showCursor(page: Page, show: boolean): Promise<void> {
  await page.evaluate((s) => {
    (window as unknown as DemoWindow).__demoCursorShow?.(s);
  }, show);
}

async function placeCursor(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ([px, py]) => {
      (window as unknown as DemoWindow).__demoCursorSet?.(px, py);
    },
    [x, y],
  );
}

async function pulseCursor(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as DemoWindow).__demoCursorPulse?.();
  });
}

async function moveCursorTo(
  page: Page,
  target: Locator,
  settleMs = 760,
): Promise<{ x: number; y: number }> {
  const box = await target.boundingBox();
  if (!box) {
    throw new Error("moveCursorTo: target has no bounding box");
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await placeCursor(page, x, y);
  await page.waitForTimeout(settleMs);
  return { x, y };
}

async function cursorClick(page: Page, target: Locator): Promise<void> {
  await moveCursorTo(page, target);
  await pulseCursor(page);
  await page.waitForTimeout(140);
  await target.click();
}

// --- scenes ----------------------------------------------------------------

const scenes: Scene[] = [
  {
    description: "Cold open — Spotlight search",
    run: async ({ page }) => {
      await page.goto(`${HOST}/`, { waitUntil: "networkidle" });
      await showCursor(page, false);
      await page.waitForTimeout(700);

      const trigger = page
        .getByRole("button", { name: "Search & actions" })
        .first();
      // Pre-position the cursor a bit away from the trigger so the move
      // is visible when we fade it in.
      const box = await trigger.boundingBox();
      if (box) {
        await placeCursor(
          page,
          Math.max(40, box.x - 180),
          box.y + box.height / 2 + 60,
        );
      }
      await showCursor(page, true);
      await setCaption(page, "Search anything — press \u2318 K");
      await page.waitForTimeout(420);

      await cursorClick(page, trigger);
      await page
        .getByRole("dialog")
        .waitFor({ state: "visible", timeout: 4000 });
      await page.waitForTimeout(260);

      // cmdk auto-focuses Command.Input on dialog open.
      await page.keyboard.type("kub", { delay: 110 });
      await page.waitForTimeout(520);
      await pulseCursor(page);
      await page.keyboard.press("Enter");

      await page.waitForLoadState("networkidle");
      await showCursor(page, false);
      await setCaption(page, "Every technology gets its own page");
      await page.waitForTimeout(900);
      await page.evaluate(() => {
        window.scrollTo({ top: 420, behavior: "smooth" });
      });
      await page.waitForTimeout(2200);
    },
  },
  {
    description: "Hover and open a blip",
    run: async ({ page }) => {
      await page.goto(`${HOST}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(450);

      const blip = page.locator('[data-item-id="react"]').first();
      await blip.waitFor({ state: "visible", timeout: 4000 });

      const box = await blip.boundingBox();
      if (box) {
        await placeCursor(page, box.x - 220, box.y + 140);
      }
      await showCursor(page, true);
      await setCaption(page, "Hover a blip to peek — click to dive in");
      await page.waitForTimeout(360);

      const { x, y } = await moveCursorTo(page, blip);
      // Drive the real mouse too so any hover-bound CSS / JS engages.
      await page.mouse.move(x, y);
      await page.waitForTimeout(900);

      await pulseCursor(page);
      await page.waitForTimeout(120);
      await blip.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(900);
    },
  },
  {
    description: "Filter by tag",
    run: async ({ page }) => {
      await page.goto(`${HOST}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(420);

      const filterRegion = page.getByRole("region", { name: "Filter radar" });
      await filterRegion.waitFor({ state: "visible", timeout: 4000 });
      const viewportHeight = page.viewportSize()?.height ?? 1040;
      const filterDocTop = await filterRegion.evaluate(
        (el) => el.getBoundingClientRect().top + window.scrollY,
      );
      await page.evaluate(
        (top) => {
          window.scrollTo({ top, behavior: "smooth" });
        },
        Math.max(0, filterDocTop - viewportHeight * 0.78),
      );
      await page.waitForTimeout(700);

      const tagBtn = filterRegion
        .getByRole("button", { name: /^frontend$/i })
        .first();
      const tagBox = await tagBtn.boundingBox();
      if (tagBox) {
        await placeCursor(page, tagBox.x - 200, tagBox.y + 90);
      }
      await showCursor(page, true);
      await setCaption(page, "Filter by tag, team, or status");
      await page.waitForTimeout(360);
      await cursorClick(page, tagBtn);
      await page.waitForTimeout(1400);

      await pulseCursor(page);
      await page.waitForTimeout(120);
      await tagBtn.click();
      await page.waitForTimeout(500);
    },
  },
  {
    description: "Open a segment view",
    run: async ({ page }) => {
      await page.goto(`${HOST}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(450);

      const segment = page.locator('svg a[href^="/tools"]').first();
      await segment.waitFor({ state: "visible", timeout: 4000 });

      const box = await segment.boundingBox();
      if (box) {
        await placeCursor(page, box.x - 180, box.y + box.height + 80);
      }
      await showCursor(page, true);
      await setCaption(page, "Zoom into a segment to compare its blips");
      await page.waitForTimeout(360);

      await cursorClick(page, segment);
      await page.waitForLoadState("networkidle");
      await showCursor(page, false);
      await page.waitForTimeout(900);
      await page.evaluate(() => {
        window.scrollTo({ top: 320, behavior: "smooth" });
      });
      await page.waitForTimeout(1800);
    },
  },
  {
    description: "Changelog — assessments over time",
    run: async ({ page }) => {
      await page.goto(`${HOST}/changelog/`, { waitUntil: "networkidle" });
      await showCursor(page, false);
      await setCaption(page, "See how assessments evolved across releases");
      await page.waitForTimeout(550);
      await page.evaluate(() => {
        window.scrollTo({ top: 360, behavior: "smooth" });
      });
      await page.waitForTimeout(1500);
    },
  },
  {
    description: "Theme swap to Synthwave",
    run: async ({ page }) => {
      await page.goto(`${HOST}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(420);

      const trigger = page
        .getByRole("button", { name: "Search & actions" })
        .first();
      const box = await trigger.boundingBox();
      if (box) {
        await placeCursor(
          page,
          Math.max(40, box.x - 180),
          box.y + box.height / 2 + 60,
        );
      }
      await showCursor(page, true);
      await setCaption(page, "Built-in themes — pick one or build your own");
      await page.waitForTimeout(380);

      await cursorClick(page, trigger);
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible", timeout: 4000 });
      await page.waitForTimeout(220);

      await page.keyboard.type(">theme", { delay: 90 });
      await page.waitForTimeout(520);
      await pulseCursor(page);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(420);

      await page.keyboard.type("synthwave", { delay: 90 });
      await page.waitForTimeout(520);
      await pulseCursor(page);
      await page.keyboard.press("Enter");

      await page.waitForTimeout(1900);
    },
  },
  {
    description: "Closing card",
    run: async ({ page }) => {
      await showCursor(page, false);
      await setCaption(
        page,
        "github.com/porscheofficial/porschedigital-technology-radar",
      );
      await page.waitForTimeout(1600);
    },
  },
];

// --- plumbing --------------------------------------------------------------

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function startStaticServer(rootDir: string, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      void (async () => {
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const p = path.normalize(
            path.join(rootDir, decodeURIComponent(url.pathname)),
          );
          if (!p.startsWith(rootDir)) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
          }
          // Resolve the file in a single read pass, no stat-then-read race
          // (CodeQL js/file-system-race). For each candidate we just try to
          // open it and let the EISDIR / ENOENT errors drive the fallback.
          // trailingSlash: true → `/foo` may resolve to `/foo/index.html` or
          // `/foo.html`. Order matters: directory index first, then `.html`.
          const candidates = [p, path.join(p, "index.html"), `${p}.html`];
          let served = false;
          for (const candidate of candidates) {
            try {
              const data = await readFile(candidate);
              const ext = path.extname(candidate).toLowerCase();
              res.writeHead(200, {
                "Content-Type": MIME[ext] ?? "application/octet-stream",
              });
              res.end(data);
              served = true;
              break;
            } catch (err) {
              const code = (err as NodeJS.ErrnoException).code;
              if (code === "EISDIR" || code === "ENOENT") continue;
              throw err;
            }
          }
          if (!served) {
            res.writeHead(404);
            res.end("Not found");
          }
        } catch (err) {
          consola.error("static server error", err);
          res.writeHead(500);
          res.end("Internal server error");
        }
      })();
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function convertWebmToWebp(
  webmPath: string,
  framesDir: string,
  outWebp: string,
): Promise<void> {
  const ffmpegArgs = [
    "-y",
    "-i",
    webmPath,
    "-vf",
    `fps=${FRAME_RATE},scale=${TARGET_WIDTH}:-1:flags=lanczos`,
    path.join(framesDir, "frame-%04d.png"),
  ];
  consola.info(`ffmpeg ${ffmpegArgs.join(" ")}`);
  await execFileAsync("ffmpeg", ffmpegArgs);

  const frames = (await readdir(framesDir))
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(framesDir, f));
  if (frames.length === 0) {
    throw new Error("ffmpeg produced no frames");
  }

  const img2webpArgs = [
    "-loop",
    "0",
    "-d",
    String(FRAME_DURATION_MS),
    "-q",
    String(WEBP_QUALITY),
    "-m",
    "6",
    ...frames,
    "-o",
    outWebp,
  ];
  consola.info(`img2webp (${frames.length} frames) → ${outWebp}`);
  await execFileAsync("img2webp", img2webpArgs);
}

async function main(): Promise<void> {
  if (!(await pathExists(OUT_DIR))) {
    consola.error(
      `Static export missing at ${OUT_DIR}. Run \`pnpm --filter @porscheofficial/porschedigital-technology-radar run build\` first.`,
    );
    process.exit(1);
  }

  await mkdir(TARGET_DIR, { recursive: true });

  consola.start(`Serving ${OUT_DIR} on ${HOST}`);
  const server = await startStaticServer(OUT_DIR, PORT);

  const tmp = await mkdtemp(path.join(tmpdir(), "techradar-demo-"));
  consola.info(`Recording into ${tmp}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      timezoneId: "Europe/Berlin",
      locale: "en-US",
      colorScheme: "dark",
      reducedMotion: "no-preference",
      recordVideo: { dir: tmp, size: VIEWPORT },
    });
    await context.addInitScript(OVERLAY_INIT_SCRIPT);
    const page = await context.newPage();

    for (const scene of scenes) {
      consola.info(`Scene: ${scene.description}`);
      await scene.run({ page });
    }

    await page.close();
    await context.close();

    const files = await readdir(tmp);
    const webm = files.find((f) => f.endsWith(".webm"));
    if (!webm) {
      throw new Error("Playwright did not produce a .webm video");
    }
    const webmPath = path.join(tmp, webm);
    consola.success(`Captured ${webmPath}`);

    await convertWebmToWebp(webmPath, tmp, TARGET_FILE);
    consola.success(`Wrote ${path.relative(REPO_ROOT, TARGET_FILE)}`);
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  consola.error(err);
  process.exit(1);
});
