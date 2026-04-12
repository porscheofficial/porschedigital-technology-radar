import { PLinkTile } from "@porsche-design-system/components-react/ssr";

import type { Quadrant } from "@/lib/types";

import styles from "./MobileQuadrantNav.module.scss";

interface MobileQuadrantNavProps {
  quadrants: Quadrant[];
}

export function MobileQuadrantNav({ quadrants }: MobileQuadrantNavProps) {
  return (
    <nav aria-label="Quadrants" className={styles.grid}>
      {quadrants.map((q) => (
        <PLinkTile
          key={q.id}
          href={`/${q.id}`}
          label="Explore"
          description={q.title}
          compact={true}
          weight="semi-bold"
          aspectRatio="4/3"
          gradient={true}
        >
          <div
            className={styles.colorSwatch}
            style={{ backgroundColor: q.color }}
          />
        </PLinkTile>
      ))}
    </nav>
  );
}
