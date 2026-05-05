import { PLinkTile, PText } from "@porsche-design-system/components-react/ssr";

import { useTheme } from "@/lib/ThemeContext";
import type { Segment } from "@/lib/types";
import { assetUrl, cn } from "@/lib/utils";

import styles from "./MobileSegmentNav.module.scss";

interface MobileSegmentNavProps {
  segments: Segment[];
}

export function MobileSegmentNav({ segments }: MobileSegmentNavProps) {
  const { theme } = useTheme();
  return (
    <nav aria-label="Segments" className={styles.grid}>
      {segments.map((q, idx) => {
        const linkTileProps = {
          href: assetUrl(`/${q.id}`),
          label: "Explore",
          description: q.title,
          size: "inherit" as const,
          compact: true,
          weight: "semi-bold" as const,
          aspectRatio: "4/3" as const,
          gradient: true,
        };

        return (
          <PLinkTile key={q.id} {...linkTileProps}>
            <div
              className={styles.colorSwatch}
              style={{ backgroundColor: theme.radar.segments[idx] }}
            />
            {q.description && (
              <PText
                slot="footer"
                size="xx-small"
                className={cn(styles.footerText, "scheme-dark")}
              >
                {q.description}
              </PText>
            )}
          </PLinkTile>
        );
      })}
    </nav>
  );
}
