import { useRouter } from "next/router";
import { useMemo } from "react";

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

  return useMemo<SpotlightAction[]>(
    () => [
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
    ],
    [router, onAfterPerform],
  );
}
