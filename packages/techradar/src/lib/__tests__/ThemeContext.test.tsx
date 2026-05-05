import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { ThemeProvider, useTheme } from "../ThemeContext";
import type { ThemeManifest } from "../theme/schema";

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
};

vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("matchMedia", () => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

const themes: ThemeManifest[] = [
  {
    id: "porsche",
    label: "Porsche",
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
    background: {
      image: { dark: "background-dark.jpg" },
      opacity: { light: 0, dark: 0.06 },
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
    assetsResolved: {
      image: { dark: "/themes/porsche/background-dark.jpg" },
    },
  },
  {
    id: "acme",
    label: "Acme",
    supports: ["dark"],
    default: "dark",
    cssVariables: {
      foreground: "#FFFFFF",
      background: "#000000",
      highlight: "#88B5FF",
      content: "#CCCCCC",
      text: "#999999",
      link: "#88B5FF",
      border: "#333333",
      tag: "#333333",
      surface: "#111111",
      footer: "#212225",
      shading: "rgba(20,20,20,0.67)",
      frosted: "rgba(40,40,40,0.35)",
    },
    radar: {
      segments: ["#7EC9AA", "#8AB6DB", "#E0C77E", "#DA8A8A"],
      rings: ["#7EC9AA", "#8AB6DB", "#E0C77E", "#DA8A8A"],
    },
    assetsResolved: {},
  },
];

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider themes={themes} initialThemeId="porsche">
      {children}
    </ThemeProvider>
  );
}

beforeEach(() => {
  localStorageMock.removeItem("techradar-theme");
  localStorageMock.removeItem("techradar-mode");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.cssText = "";
  document.documentElement.className = "";
});

describe("ThemeContext", () => {
  it("exposes theme and mode state", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.id).toBe("porsche");
    expect(result.current.mode).toBe("system");
    expect(result.current.themes).toHaveLength(2);
  });

  it("setActiveTheme persists the theme and updates document state", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setActiveTheme("acme");
    });

    expect(result.current.theme.id).toBe("acme");
    expect(result.current.mode).toBe("dark");
    expect(localStorageMock.getItem("techradar-theme")).toBe("acme");
    expect(document.documentElement.getAttribute("data-theme")).toBe("acme");
    expect(document.documentElement.classList.contains("scheme-dark")).toBe(
      true,
    );
  });

  it("setMode persists explicit mode for dual-mode themes", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setMode("light");
    });

    expect(result.current.mode).toBe("light");
    expect(localStorageMock.getItem("techradar-mode")).toBe("light");
    expect(document.documentElement.classList.contains("scheme-light")).toBe(
      true,
    );
    expect(result.current.theme.cssVariables.link).toBe("#0047FF");
  });

  it("forces single-mode themes back to their supported mode", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setActiveTheme("acme");
    });

    expect(result.current.mode).toBe("dark");
    expect(localStorageMock.getItem("techradar-mode")).toBe("dark");
  });

  it("does not write chrome CSS custom properties to root inline style (would short-circuit light-dark() reactivity)", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setActiveTheme("porsche");
      result.current.setMode("dark");
    });

    const inline = document.documentElement.getAttribute("style") ?? "";
    expect(inline).not.toMatch(/--foreground/);
    expect(inline).not.toMatch(/--background\b/);
    expect(inline).not.toMatch(/--link/);
    expect(inline).not.toMatch(/--background-image/);
    expect(inline).not.toMatch(/--background-opacity/);
  });
});
