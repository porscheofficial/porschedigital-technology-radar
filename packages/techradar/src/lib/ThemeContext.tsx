import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  normalizeThemePreferenceMode,
  type ResolvedTheme,
  resolveTheme,
  type Theme,
  type ThemeManifest,
  type ThemeMode,
  type ThemePreferenceMode,
} from "@/lib/theme/schema";

const THEME_STORAGE_KEY = "techradar-theme";
const MODE_STORAGE_KEY = "techradar-mode";

export interface ThemeContextValue {
  theme: Theme;
  themes: ThemeManifest[];
  activeTheme: ThemeManifest;
  mode: ThemePreferenceMode;
  setActiveTheme: (id: string) => void;
  setMode: (mode: ThemePreferenceMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  themes: ThemeManifest[];
  initialThemeId: string;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({
  children,
  themes,
  initialThemeId,
}) => {
  const { themeId: parsedThemeId, mode: initialMode } = parseInitialThemeId(
    initialThemeId,
    themes,
  );

  const initialTheme = themes.find((entry) => entry.id === parsedThemeId);
  if (!initialTheme) {
    throw new Error(
      `ThemeProvider: initialThemeId "${initialThemeId}" not found in themes [${themes
        .map((entry) => entry.id)
        .join(
          ", ",
        )}]. Check config.defaultTheme matches a folder under data/themes/.`,
    );
  }

  const [activeThemeId, setActiveThemeId] = useState(initialTheme.id);
  const [mode, setModeState] = useState<ThemePreferenceMode>(
    normalizeThemePreferenceMode(initialMode, initialTheme),
  );

  const activeTheme = useMemo(() => {
    const next = themes.find((entry) => entry.id === activeThemeId);
    if (!next) {
      throw new Error(
        `ThemeContext: unknown theme id "${activeThemeId}". Available: [${themes
          .map((entry) => entry.id)
          .join(", ")}]`,
      );
    }
    return next;
  }, [activeThemeId, themes]);

  const resolvedMode = useMemo(
    () => resolveEffectiveMode(mode, activeTheme),
    [mode, activeTheme],
  );

  const theme = useMemo<ResolvedTheme>(
    () => resolveTheme(activeTheme, resolvedMode),
    [activeTheme, resolvedMode],
  );

  const applyDomState = useCallback(
    (
      nextTheme: ThemeManifest,
      nextMode: ThemePreferenceMode,
      nextResolvedMode: ThemeMode,
    ) => {
      const root = document.documentElement;

      // Theme selection toggles the data-theme attribute; CSS rules in
      // <style id="theme-vars"> (emitted by _document.tsx) resolve every chrome
      // CSS custom property via light-dark() per theme. Mode switches the
      // scheme-* class; CSS color-scheme then drives light-dark() resolution.
      // No inline JS setProperty: that would short-circuit the CSS reactivity.
      root.removeAttribute("data-theme");
      root.setAttribute("data-theme", nextTheme.id);
      root.classList.remove("scheme-light", "scheme-dark", "scheme-light-dark");
      root.classList.add(getSchemeClassName(nextMode, nextResolvedMode));

      if (typeof window !== "undefined") {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme.id);
        localStorage.setItem(MODE_STORAGE_KEY, nextMode);
      }
    },
    [],
  );

  const setActiveTheme = useCallback(
    (id: string) => {
      const nextTheme = themes.find((entry) => entry.id === id);
      if (!nextTheme) {
        throw new Error(
          `ThemeContext.setActiveTheme: unknown theme id "${id}". Available: [${themes
            .map((entry) => entry.id)
            .join(", ")}]`,
        );
      }

      const nextMode = normalizeThemePreferenceMode(mode, nextTheme);
      const nextResolvedMode = resolveEffectiveMode(nextMode, nextTheme);
      applyDomState(nextTheme, nextMode, nextResolvedMode);
      setActiveThemeId(nextTheme.id);
      setModeState(nextMode);
    },
    [applyDomState, mode, themes],
  );

  const setMode = useCallback(
    (nextMode: ThemePreferenceMode) => {
      const normalizedMode = normalizeThemePreferenceMode(
        nextMode,
        activeTheme,
      );
      const nextResolvedMode = resolveEffectiveMode(
        normalizedMode,
        activeTheme,
      );
      applyDomState(activeTheme, normalizedMode, nextResolvedMode);
      setModeState(normalizedMode);
    },
    [applyDomState, activeTheme],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
    const nextTheme =
      themes.find((entry) => entry.id === storedThemeId) ?? initialTheme;
    const nextMode = isPreferenceMode(storedMode)
      ? normalizeThemePreferenceMode(storedMode, nextTheme)
      : normalizeThemePreferenceMode(initialMode, nextTheme);

    setActiveThemeId(nextTheme.id);
    setModeState(nextMode);
    applyDomState(
      nextTheme,
      nextMode,
      resolveEffectiveMode(nextMode, nextTheme),
    );
  }, [applyDomState, initialTheme, initialMode, themes]);

  useEffect(() => {
    if (mode !== "system" || !activeTheme.supports.includes("dark")) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      applyDomState(activeTheme, mode, resolveEffectiveMode(mode, activeTheme));
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [applyDomState, activeTheme, mode]);

  return (
    <ThemeContext.Provider
      value={{ theme, themes, activeTheme, mode, setActiveTheme, setMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useTheme() must be called inside a <ThemeProvider>. Wrap your tree at the app root.",
    );
  }
  return ctx;
}

function parseInitialThemeId(initialThemeId: string, themes: ThemeManifest[]) {
  const [themeId, rawMode] = initialThemeId.split(":");
  const entry = themes.find((candidate) => candidate.id === themeId);
  if (!entry) {
    return { themeId: initialThemeId, mode: "system" as ThemePreferenceMode };
  }

  const mode = isPreferenceMode(rawMode)
    ? normalizeThemePreferenceMode(rawMode, entry)
    : getDefaultPreferenceMode(entry);

  return { themeId, mode };
}

function resolveEffectiveMode(
  mode: ThemePreferenceMode,
  theme: ThemeManifest,
): ThemeMode {
  const normalizedMode = normalizeThemePreferenceMode(mode, theme);
  if (normalizedMode === "system") {
    if (typeof window === "undefined") {
      return theme.default;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return normalizedMode;
}

function isPreferenceMode(
  value: string | null | undefined,
): value is ThemePreferenceMode {
  return value === "light" || value === "dark" || value === "system";
}

// When the consumer doesn't pin a mode in `config.defaultTheme` (e.g. just
// `"porsche"` instead of `"porsche:system"`), we honor the theme manifest's
// `default` field. Previously dual-mode themes silently overrode this to
// `"system"`, which made `manifest.default` a dead field and forced first-time
// visitors of e.g. Porsche (default `"dark"`) to land on whatever their OS
// preference said. Consumers who *want* OS-driven mode can opt in with
// `defaultTheme: "porsche:system"`.
function getDefaultPreferenceMode(theme: ThemeManifest): ThemePreferenceMode {
  return theme.default;
}

function getSchemeClassName(
  mode: ThemePreferenceMode,
  resolvedMode: ThemeMode,
): "scheme-light" | "scheme-dark" | "scheme-light-dark" {
  if (mode === "system") {
    return "scheme-light-dark";
  }

  return resolvedMode === "light" ? "scheme-light" : "scheme-dark";
}
