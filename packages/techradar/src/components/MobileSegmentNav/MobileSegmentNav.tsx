import {
  PLinkTile,
  PTag,
  PText,
} from "@porsche-design-system/components-react/ssr";

import { useTheme } from "@/lib/ThemeContext";
import type { Item, Ring, Segment } from "@/lib/types";
import { assetUrl, cn } from "@/lib/utils";

import styles from "./MobileSegmentNav.module.scss";

interface MobileSegmentNavProps {
  segments: Segment[];
  items: Item[];
  rings: Ring[];
}

export function MobileSegmentNav({
  segments,
  items,
  rings,
}: MobileSegmentNavProps) {
  const { theme } = useTheme();
  return (
    <nav aria-label="Segments" className={styles.grid}>
      {segments.map((q, idx) => {
        const segmentItems = items.filter((item) => item.segment === q.id);
        const ringCounts = rings.map((ring) => ({
          ring,
          count: segmentItems.filter((item) => item.ring === ring.id).length,
        }));

        const linkTileProps = {
          href: assetUrl(`/${q.id}`),
          label: "Explore",
          description: q.title,
          size: "inherit" as const,
          compact: true,
          weight: "semi-bold" as const,
          aspectRatio: "16/9" as const,
          gradient: true,
        };

        return (
          <PLinkTile key={q.id} {...linkTileProps}>
            <div slot="header" className={styles.tagRow}>
              {ringCounts
                .filter(({ count }) => count > 0)
                .map(({ ring, count }) => (
                  <PTag
                    key={ring.id}
                    variant="info-frosted"
                    compact
                    aria-label={`${count} ${ring.title}`}
                  >
                    {ring.title} {count}
                  </PTag>
                ))}
            </div>
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
