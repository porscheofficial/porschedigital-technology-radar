import type { ThemeManifest } from "@/lib/theme/schema";
import rawThemes from "../../data/themes.generated.json";

export function getThemes(): ThemeManifest[] {
  return rawThemes as ThemeManifest[];
}
