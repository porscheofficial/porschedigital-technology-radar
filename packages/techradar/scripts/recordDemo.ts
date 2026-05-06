// recordDemo.ts — generate the animated WebP shown in the repo README.
//
// Reproducible recording of the live UI: theming + key pages. The script
// boots a static file server against the already-built `out/` directory,
// drives a headless Chromium through a declarative scene list with
// Playwright, captures a WebM via Playwright's recordVideo, then assembles
// the animated WebP from PNG frames using ffmpeg (frame extraction) and
// img2webp from libwebp (animation muxing).
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
import { chromium, type Page } from "playwright";

const execFileAsync = promisify(execFile);
const FRAME_RATE = 12;
const FRAME_DURATION_MS = Math.round(1000 / FRAME_RATE);
const TARGET_WIDTH = 1024;
const WEBP_QUALITY = 75;

const PORT = 4319;
const HOST = `http://127.0.0.1:${PORT}`;
const VIEWPORT = { width: 1440, height: 1040 } as const;

// Injected via addInitScript so the caption survives navigation + reload.
// The script appends a fixed overlay on DOMContentLoaded and exposes
// `window.__setDemoCaption(text)` for the recorder to drive per-scene labels.
const CAPTION_INIT_SCRIPT = `
(() => {
  try {
    localStorage.setItem("radar-disclaimer-dismissed", "1");
  } catch {}
  const ID = "__demo_caption__";
  const ensure = () => {
    let el = document.getElementById(ID);
    if (!el) {
      el = document.createElement("div");
      el.id = ID;
      el.style.cssText = [
        "position:fixed",
        "left:50%",
        "bottom:36px",
        "transform:translateX(-50%)",
        "z-index:2147483647",
        "padding:16px 32px",
        "border-radius:18px",
        "background:linear-gradient(135deg,rgba(15,15,20,0.92),rgba(40,40,55,0.92))",
        "color:#fff",
        "font:700 26px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif",
        "letter-spacing:0.005em",
        "border:1px solid rgba(255,255,255,0.14)",
        "box-shadow:0 12px 40px rgba(0,0,0,0.45),0 0 0 1px rgba(255,255,255,0.05) inset",
        "backdrop-filter:blur(8px)",
        "-webkit-backdrop-filter:blur(8px)",
        "pointer-events:none",
        "max-width:82vw",
        "text-align:center",
        "transition:opacity 220ms ease,transform 220ms ease",
        "opacity:0",
      ].join(";");
      document.body.appendChild(el);
    }
    return el;
  };
  const apply = () => ensure();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }
  window.__setDemoCaption = (text) => {
    const el = ensure();
    if (!text) {
      el.style.opacity = "0";
      return;
    }
    el.textContent = text;
    el.style.opacity = "1";
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

interface Scene {
  description: string;
  caption: string;
  action: (page: Page) => Promise<void>;
  hold: number;
}

async function setCaption(page: Page, text: string): Promise<void> {
  await page.evaluate((t) => {
    const w = window as unknown as { __setDemoCaption?: (s: string) => void };
    w.__setDemoCaption?.(t);
  }, text);
}

const scenes: Scene[] = [
  {
    description: "Land on the radar",
    caption: "The Tech Radar — adopt · trial · assess · hold",
    action: async (page) => {
      await page.goto(`${HOST}/`, { waitUntil: "networkidle" });
    },
    hold: 2600,
  },
  {
    description: "Open the Tools segment",
    caption: "Segment view — zoom into one quadrant",
    action: async (page) => {
      await page.goto(`${HOST}/tools/`, { waitUntil: "networkidle" });
    },
    hold: 2600,
  },
  {
    description: "Open the Copilot item detail",
    caption: "Item detail — rationale, history, links",
    action: async (page) => {
      await page.goto(`${HOST}/tools/copilot/`, { waitUntil: "networkidle" });
    },
    hold: 2800,
  },
  {
    description: "Back to the radar",
    caption: "Theming — pick a palette, then a mode",
    action: async (page) => {
      await page.goto(`${HOST}/`, { waitUntil: "networkidle" });
    },
    hold: 1600,
  },
  {
    description: "Switch theme to synthwave",
    caption: "Theme: Synthwave",
    action: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem("techradar-theme", "synthwave");
      });
      await page.reload({ waitUntil: "networkidle" });
    },
    hold: 2400,
  },
  {
    description: "Switch to light mode",
    caption: "Light mode",
    action: async (page) => {
      await page
        .getByRole("button", { name: /Theme mode: Light/i })
        .first()
        .click();
    },
    hold: 2000,
  },
  {
    description: "Switch back to dark mode",
    caption: "Dark mode",
    action: async (page) => {
      await page
        .getByRole("button", { name: /Theme mode: Dark/i })
        .first()
        .click();
    },
    hold: 1900,
  },
  {
    description: "Final hold",
    caption: "github.com/porscheofficial/porschedigital-technology-radar",
    action: async () => {
      // intentionally idle — lets the closing caption breathe
    },
    hold: 1600,
  },
];

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
          let p = path.normalize(
            path.join(rootDir, decodeURIComponent(url.pathname)),
          );
          if (!p.startsWith(rootDir)) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
          }
          let s: Awaited<ReturnType<typeof stat>>;
          try {
            s = await stat(p);
          } catch {
            // trailingSlash: true → also accept `/foo` resolving to `/foo/index.html`
            const withHtml = `${p}.html`;
            if (await pathExists(withHtml)) {
              const data = await readFile(withHtml);
              res.writeHead(200, { "Content-Type": MIME[".html"] });
              res.end(data);
              return;
            }
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          if (s.isDirectory()) {
            p = path.join(p, "index.html");
          }
          const data = await readFile(p);
          const ext = path.extname(p).toLowerCase();
          res.writeHead(200, {
            "Content-Type": MIME[ext] ?? "application/octet-stream",
          });
          res.end(data);
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
    await context.addInitScript(CAPTION_INIT_SCRIPT);
    const page = await context.newPage();

    for (const scene of scenes) {
      consola.info(`Scene: ${scene.description}`);
      await scene.action(page);
      await setCaption(page, scene.caption);
      await page.waitForTimeout(scene.hold);
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
