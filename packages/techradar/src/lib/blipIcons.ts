import { Flag } from "@/lib/types";

export const blipSvgMap: Record<string, string> = {
  [Flag.New]:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-5 -4 24 22'%3E%3Cpath d='m.247 10.212 5.02-8.697a2 2 0 0 1 3.465 0l5.021 8.697a2 2 0 0 1-1.732 3H1.98a2 2 0 0 1-1.732-3z' fill='currentColor'/%3E%3C/svg%3E",
  [Flag.Changed]:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 24 24'%3E%3Crect width='12' height='12' x='2' y='2' rx='3' transform='rotate(-45 8 8)' fill='currentColor'/%3E%3C/svg%3E",
  [Flag.Default]:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 24 24'%3E%3Ccircle cx='8' cy='8' r='6' fill='currentColor'/%3E%3C/svg%3E",
};
