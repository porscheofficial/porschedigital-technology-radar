import { useRouter } from "next/router";
import { useMemo } from "react";

import { exportRadarImage } from "@/lib/exportRadarImage";
import { assetUrl } from "@/lib/utils";

export type SpotlightAction = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  perform: () => void;
};

export function useSpotlightActions(
  onAfterPerform: () => void,
): SpotlightAction[] {
  const router = useRouter();
  const isStartPage = router.pathname === "/";

  return useMemo<SpotlightAction[]>(() => {
    const actions: SpotlightAction[] = [
      {
        id: "nav-home",
        label: "Go to Home",
        hint: "Open the radar overview",
        keywords: ["home", "radar", "start", "overview"],
        perform: () => {
          router.push(assetUrl("/")).catch(() => {});
          onAfterPerform();
        },
      },
      {
        id: "nav-changelog",
        label: "Go to Changelog",
        hint: "Open the changelog page",
        keywords: ["history", "changelog", "changes", "diff"],
        perform: () => {
          router.push(assetUrl("/changelog")).catch(() => {});
          onAfterPerform();
        },
      },
      {
        id: "nav-about",
        label: "Go to About",
        hint: "Open the help and about page",
        keywords: ["about", "help", "info"],
        perform: () => {
          router.push(assetUrl("/help-and-about-tech-radar")).catch(() => {});
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
    return actions;
  }, [router, onAfterPerform, isStartPage]);
}
