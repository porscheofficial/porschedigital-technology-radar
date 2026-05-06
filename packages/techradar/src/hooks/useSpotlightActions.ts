import { useRouter } from "next/router";
import { useMemo } from "react";

import { exportRadarImage } from "@/lib/exportRadarImage";
import { useTheme } from "@/lib/ThemeContext";
import type { ThemeManifest, ThemePreferenceMode } from "@/lib/theme/schema";

export type SpotlightAction = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  perform: () => void;
  /** When set, selecting the action opens a submenu of children instead of running `perform`. */
  children?: SpotlightAction[];
  /** Marks this action as the currently-applied option inside its parent submenu. */
  active?: boolean;
};

export function useSpotlightActions(
  onAfterPerform: () => void,
): SpotlightAction[] {
  const router = useRouter();
  const isStartPage = router.pathname === "/";
  const { themes, activeTheme, mode, setActiveTheme, setMode } = useTheme();

  return useMemo<SpotlightAction[]>(() => {
    const actions: SpotlightAction[] = [
      {
        id: "nav-home",
        label: "Go to Home",
        hint: "Open the radar overview",
        keywords: ["home", "radar", "start", "overview"],
        perform: () => {
          router.push("/").catch(() => {});
          onAfterPerform();
        },
      },
      {
        id: "nav-changelog",
        label: "Go to Changelog",
        hint: "Open the changelog page",
        keywords: ["history", "changelog", "changes", "diff"],
        perform: () => {
          router.push("/changelog").catch(() => {});
          onAfterPerform();
        },
      },
      {
        id: "nav-about",
        label: "Go to About",
        hint: "Open the help and about page",
        keywords: ["about", "help", "info"],
        perform: () => {
          router.push("/help-and-about-tech-radar").catch(() => {});
          onAfterPerform();
        },
      },
      {
        id: "link-copy",
        label: "Copy link to current page",
        hint: "Put the current URL on the clipboard",
        keywords: ["copy", "url", "link", "share"],
        perform: () => {
          if (typeof window === "undefined") return;
          const url = window.location.href;
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).catch(() => {});
          }
          onAfterPerform();
        },
      },
    ];
    if (isStartPage) {
      actions.push({
        id: "export-png",
        label: "Export radar as PNG",
        hint: "Download the current radar view as an image",
        keywords: ["export", "png", "image", "download", "save", "screenshot"],
        perform: () => {
          exportRadarImage().catch(() => {});
          onAfterPerform();
        },
      });
    }
    const themeChildren: SpotlightAction[] = [...themes]
      .sort(sortThemes)
      .map((theme) => ({
        id: `theme-${theme.id}`,
        label: `Theme: ${theme.label}`,
        hint: theme.id === activeTheme.id ? "Current theme" : undefined,
        keywords: ["theme", "appearance", theme.id, theme.label.toLowerCase()],
        active: theme.id === activeTheme.id,
        perform: () => {
          setActiveTheme(theme.id);
          onAfterPerform();
        },
      }));

    actions.push({
      id: "theme-picker",
      label: "Select Theme",
      hint: activeTheme.label,
      keywords: ["theme", "appearance", "color", "select", "change"],
      perform: () => {},
      children: themeChildren,
    });

    if (activeTheme.supports.length === 2) {
      const modeOptions: ThemePreferenceMode[] = ["light", "dark", "system"];
      const modeChildren: SpotlightAction[] = modeOptions.map((entry) => ({
        id: `mode-${entry}`,
        label: `Mode: ${capitalize(entry)}`,
        hint: entry === mode ? "Current mode" : undefined,
        keywords: ["mode", "theme", "appearance", entry],
        active: entry === mode,
        perform: () => {
          setMode(entry);
          onAfterPerform();
        },
      }));

      actions.push({
        id: "mode-picker",
        label: "Select Mode",
        hint: capitalize(mode),
        keywords: ["mode", "theme", "appearance", "select", "change"],
        perform: () => {},
        children: modeChildren,
      });
    }
    return actions;
  }, [
    router,
    onAfterPerform,
    isStartPage,
    themes,
    activeTheme,
    mode,
    setActiveTheme,
    setMode,
  ]);
}

function sortThemes(left: ThemeManifest, right: ThemeManifest): number {
  return left.label.localeCompare(right.label);
}

function capitalize(value: ThemePreferenceMode): string {
  return value[0].toUpperCase() + value.slice(1);
}
