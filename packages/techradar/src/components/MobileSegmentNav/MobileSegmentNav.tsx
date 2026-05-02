import { PLinkTile, PText } from "@porsche-design-system/components-react/ssr";

import type { Segment } from "@/lib/types";
import { assetUrl } from "@/lib/utils";

import styles from "./MobileSegmentNav.module.scss";

interface MobileSegmentNavProps {
  segments: Segment[];
}

export function MobileSegmentNav({ segments }: MobileSegmentNavProps) {
  return (
    <nav aria-label="Segments" className={styles.grid}>
      {segments.map((q) => (
        <PLinkTile
          key={q.id}
          href={assetUrl(`/${q.id}`)}
          label="Explore"
          description={q.title}
          size="inherit"
          compact={true}
          weight="semi-bold"
          aspectRatio="4/3"
          gradient={true}
        >
          <div
            className={styles.colorSwatch}
            style={{ backgroundColor: q.color }}
          />
          {q.description && (
            <PText
              slot="footer"
              theme="dark"
              size="xx-small"
              className={styles.footerText}
            >
              {q.description}
            </PText>
          )}
        </PLinkTile>
      ))}
    </nav>
  );
}
