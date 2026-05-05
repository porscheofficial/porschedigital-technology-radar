import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ThemeManifest } from "@/lib/theme/schema";
import { materializeThemeAssets } from "../assets";

const BASE_THEME: ThemeManifest = {
  id: "test-theme",
  label: "Test Theme",
  supports: ["light", "dark"],
  default: "dark",
  cssVariables: {
    foreground: { light: "#111111", dark: "#FFFFFF" },
    background: { light: "#F6F6F6", dark: "#000000" },
    highlight: { light: "#0047FF", dark: "#88B5FF" },
    content: { light: "#555555", dark: "#CCCCCC" },
    text: { light: "#666666", dark: "#999999" },
    link: { light: "#0047FF", dark: "#88B5FF" },
    border: { light: "#D0D0D0", dark: "#333333" },
    tag: { light: "#E5E5E5", dark: "#333333" },
    surface: { light: "#FFFFFF", dark: "#111111" },
    footer: { light: "#FFFFFF", dark: "#212225" },
    shading: { light: "rgba(20,20,20,0.2)", dark: "rgba(20,20,20,0.67)" },
    frosted: { light: "rgba(255,255,255,0.5)", dark: "rgba(40,40,40,0.35)" },
  },
  radar: {
    segments: [
      { light: "#4A9E7E", dark: "#7EC9AA" },
      { light: "#5B8DB8", dark: "#8AB6DB" },
      { light: "#C4A85E", dark: "#E0C77E" },
      { light: "#B85B5B", dark: "#DA8A8A" },
    ],
    rings: [
      { light: "#4A9E7E", dark: "#7EC9AA" },
      { light: "#5B8DB8", dark: "#8AB6DB" },
      { light: "#C4A85E", dark: "#E0C77E" },
      { light: "#B85B5B", dark: "#DA8A8A" },
    ],
  },
  assetsResolved: {},
};

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "assets-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("materializeThemeAssets", () => {
  it("copies per-mode and shared assets into public/themes/<theme>", () => {
    const themeDir = path.join(tmpDir, "source", "test-theme");
    fs.mkdirSync(themeDir, { recursive: true });
    fs.writeFileSync(path.join(themeDir, "background-dark.jpg"), "bg-dark");
    fs.writeFileSync(path.join(themeDir, "header-light.svg"), "header-light");
    fs.writeFileSync(path.join(themeDir, "header-dark.svg"), "header-dark");
    fs.writeFileSync(path.join(themeDir, "footer.svg"), "footer");

    const publicDir = path.join(tmpDir, "public");
    const theme: ThemeManifest = {
      ...BASE_THEME,
      background: {
        image: { dark: "background-dark.jpg" },
        opacity: { light: 0, dark: 0.06 },
      },
      headerLogoFile: { light: "header-light.svg", dark: "header-dark.svg" },
      footerLogoFile: "footer.svg",
    };

    const result = materializeThemeAssets({
      themes: [theme],
      publicDir,
      sourceRootByThemeId: { "test-theme": themeDir },
    });

    expect(result[0].assetsResolved.image).toEqual({
      dark: "/themes/test-theme/background-dark.jpg",
    });
    expect(result[0].assetsResolved.headerLogo).toEqual({
      light: "/themes/test-theme/header-light.svg",
      dark: "/themes/test-theme/header-dark.svg",
    });
    expect(result[0].assetsResolved.footerLogo).toBe(
      "/themes/test-theme/footer.svg",
    );
  });

  it("does not mutate the input theme", () => {
    const theme: ThemeManifest = { ...BASE_THEME };
    const result = materializeThemeAssets({
      themes: [theme],
      publicDir: path.join(tmpDir, "public"),
      sourceRootByThemeId: {},
    });

    expect(theme.assetsResolved).toEqual({});
    expect(result[0].assetsResolved).toEqual({});
  });
});
