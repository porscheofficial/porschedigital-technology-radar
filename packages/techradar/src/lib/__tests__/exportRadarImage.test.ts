import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exportRadarImage } from "@/lib/exportRadarImage";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeRadar(): HTMLDivElement {
  const radar = document.createElement("div");
  radar.setAttribute("role", "img");
  radar.setAttribute("aria-label", "Technology radar");
  document.body.appendChild(radar);
  return radar;
}

function makeSvg(radar: HTMLDivElement): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
  svg.setAttribute("viewBox", "0 0 400 400");
  svg.setAttribute("width", "400");
  svg.setAttribute("height", "400");
  svg.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 400,
      height: 400,
      right: 400,
      bottom: 400,
    }) as DOMRect;
  Object.defineProperty(svg, "viewBox", {
    value: { baseVal: { width: 400, height: 400, x: 0, y: 0 } },
    configurable: true,
  });
  radar.appendChild(svg);
  return svg;
}

function attachTooltip(
  radar: HTMLDivElement,
  id: string,
  text: string,
  rect: { left: number; top: number; size: number },
): HTMLAnchorElement {
  const a = document.createElement("a");
  a.setAttribute("data-item-id", id);
  a.style.opacity = "1";
  a.style.setProperty("--tooltip", "#abc123");
  a.textContent = text;
  a.getBoundingClientRect = () =>
    ({
      left: rect.left,
      top: rect.top,
      width: rect.size,
      height: rect.size,
      right: rect.left + rect.size,
      bottom: rect.top + rect.size,
    }) as DOMRect;
  radar.appendChild(a);
  return a;
}

describe("exportRadarImage", () => {
  let originalImage: typeof Image;
  let originalToDataURL: HTMLCanvasElement["toDataURL"];
  let originalGetContext: HTMLCanvasElement["getContext"];
  let lastSerializedSvg: string;

  beforeEach(() => {
    document.body.innerHTML = "";
    lastSerializedSvg = "";
    originalImage = globalThis.Image;
    class StubImage {
      onload?: () => void;
      onerror?: () => void;
      private _src = "";
      get src(): string {
        return this._src;
      }
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      writable: true,
      value: StubImage as unknown as typeof Image,
    });
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blob.text().then((t) => {
        lastSerializedSvg = t;
      });
      return "blob:fake";
    });
    URL.revokeObjectURL = vi.fn();
    originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function stub(): string {
      return "data:image/png;base64,STUB";
    };
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext() {
      return {
        fillStyle: "",
        fillRect: () => {},
        drawImage: () => {},
      } as unknown as CanvasRenderingContext2D;
    } as unknown as HTMLCanvasElement["getContext"];
  });

  afterEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      writable: true,
      value: originalImage,
    });
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("returns false when no radar is mounted", async () => {
    await expect(exportRadarImage()).resolves.toBe(false);
  });

  it("returns false when the radar has no inner svg", async () => {
    makeRadar();
    await expect(exportRadarImage()).resolves.toBe(false);
  });

  it("rasterizes the inner svg and triggers a PNG download", async () => {
    const radar = makeRadar();
    makeSvg(radar);
    const clicks: HTMLAnchorElement[] = [];
    const realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function patched() {
      clicks.push(this);
    };
    try {
      await expect(exportRadarImage()).resolves.toBe(true);
    } finally {
      HTMLAnchorElement.prototype.click = realClick;
    }
    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.getAttribute("download")).toBe("technology-radar.png");
    expect(clicks[0]?.getAttribute("href")).toBe("data:image/png;base64,STUB");
    await Promise.resolve();
    await Promise.resolve();
    expect(lastSerializedSvg).toContain("<svg");
  });

  it("composes visible tooltip overlays as svg <g> nodes in the export", async () => {
    const radar = makeRadar();
    makeSvg(radar);
    attachTooltip(radar, "visible-blip", "Visible Tip", {
      left: 100,
      top: 80,
      size: 12,
    });
    const hidden = attachTooltip(radar, "hidden-blip", "Hidden Tip", {
      left: 200,
      top: 200,
      size: 12,
    });
    hidden.style.opacity = "0";
    HTMLAnchorElement.prototype.click = function noop() {};
    await exportRadarImage();
    await Promise.resolve();
    await Promise.resolve();
    expect(lastSerializedSvg).toContain("Visible Tip");
    expect(lastSerializedSvg).not.toContain("Hidden Tip");
    expect(lastSerializedSvg).toContain('fill="#abc123"');
    expect(lastSerializedSvg).toContain("<polygon");
  });

  it("uses the page background colour when filling the canvas", async () => {
    const radar = makeRadar();
    makeSvg(radar);
    document.body.style.backgroundColor = "rgb(20, 30, 40)";
    let observed = "";
    HTMLCanvasElement.prototype.getContext = function getContext() {
      const ctx = {
        fillStyle: "",
        fillRect() {
          observed = ctx.fillStyle;
        },
        drawImage() {},
      };
      return ctx as unknown as CanvasRenderingContext2D;
    } as unknown as HTMLCanvasElement["getContext"];
    HTMLAnchorElement.prototype.click = function noop() {};
    await exportRadarImage();
    document.body.style.backgroundColor = "";
    expect(observed).toBe("rgb(20, 30, 40)");
  });

  it("injects @font-face rules from document stylesheets into the cloned svg", async () => {
    const radar = makeRadar();
    makeSvg(radar);
    const styleEl = document.createElement("style");
    styleEl.textContent =
      "@font-face { font-family: 'Porsche Next'; src: url('https://cdn.example/pn.woff2') format('woff2'); }";
    document.head.appendChild(styleEl);
    await exportRadarImage();
    styleEl.remove();
    expect(lastSerializedSvg).toContain("@font-face");
    expect(lastSerializedSvg).toContain("Porsche Next");
  });

  it("returns false when image rasterization fails", async () => {
    const radar = makeRadar();
    makeSvg(radar);
    class FailingImage {
      onload?: () => void;
      onerror?: () => void;
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      writable: true,
      value: FailingImage as unknown as typeof Image,
    });
    await expect(exportRadarImage()).resolves.toBe(false);
  });
});
