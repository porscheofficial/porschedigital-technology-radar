import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { ThemeProvider, useTheme } from "@/lib/ThemeContext";
import type { ThemeManifest } from "@/lib/theme/schema";

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

const themes = [
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
  },
] satisfies ThemeManifest[];

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider themes={themes} initialThemeId="porsche">
      {children}
    </ThemeProvider>
  );
}

beforeEach(() => {
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.cssText = "";
  localStorageMock.removeItem("techradar-theme");
  localStorageMock.removeItem("techradar-mode");
});

it("toggles the documentElement scheme class when setMode switches light, dark, and system", () => {
  const { result } = renderHook(() => useTheme(), { wrapper });

  act(() => {
    result.current.setMode("light");
  });

  expect(document.documentElement.classList.contains("scheme-light")).toBe(
    true,
  );

  act(() => {
    result.current.setMode("dark");
  });

  expect(document.documentElement.classList.contains("scheme-dark")).toBe(true);

  act(() => {
    result.current.setMode("system");
  });

  expect(document.documentElement.classList.contains("scheme-light-dark")).toBe(
    true,
  );
});
