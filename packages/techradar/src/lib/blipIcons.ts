import { Flag } from "@/lib/types";

// SVG data URLs for blip flag shapes. Each viewBox is sized 16x16 with the
// shape drawn to fill the box. RadarFilters.module.scss .blipIcon uses these
// as a CSS mask in a 16x16 container so the rendered icon visually matches
// the 16px PIcon used for tag/team chips. The shapes use `currentColor` so
// they inherit `--rtk-chip-status-fg` from the parent Chip.
export const blipSvgMap: Record<string, string> = {
  [Flag.New]:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M6.27 2.5a2 2 0 0 1 3.46 0l5.02 8.7a2 2 0 0 1-1.73 3H2.98a2 2 0 0 1-1.73-3z' fill='currentColor'/%3E%3C/svg%3E",
  [Flag.Changed]:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='2.5' y='2.5' width='11' height='11' rx='2' transform='rotate(45 8 8)' fill='currentColor'/%3E%3C/svg%3E",
  [Flag.Default]:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='7' fill='currentColor'/%3E%3C/svg%3E",
};
