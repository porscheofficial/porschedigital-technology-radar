import Link from "next/link";
import { type CSSProperties, type FC, useRef } from "react";
import { QuadrantChart } from "@/components/QuadrantRadar/QuadrantChart";
import { useRadarTooltip } from "@/hooks/useRadarTooltip";
import type { Item, Quadrant, Ring } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./QuadrantRadar.module.scss";

interface QuadrantRadarProps {
  quadrant: Quadrant;
  allQuadrants: Quadrant[];
  rings: Ring[];
  items: Item[];
  activeRings?: Set<string>;
}

export const QuadrantRadar: FC<QuadrantRadarProps> = ({
  quadrant,
  allQuadrants,
  rings,
  items,
  activeRings,
}) => {
  const radarRef = useRef<HTMLDivElement>(null);
  const {
    tooltip,
    tooltipStyle,
    tooltipMap,
    shownIds,
    handleMouseMove,
    handleMouseLeave,
  } = useRadarTooltip(radarRef);

  return (
    <div
      ref={radarRef}
      className={styles.quadrantRadar}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label="Quadrant radar"
    >
      <QuadrantChart
        className={styles.chart}
        quadrant={quadrant}
        allQuadrants={allQuadrants}
        rings={rings}
        items={items}
        activeRings={activeRings}
      />
      <span
        className={cn(styles.tooltip, tooltip.show && styles.isShown)}
        style={tooltipStyle}
      >
        {tooltip.text}
      </span>
      {Array.from(tooltipMap.values()).map((pt) => (
        <Link
          key={pt.id}
          href={pt.href}
          data-item-id={pt.id}
          className={cn(styles.tooltip, shownIds.has(pt.id) && styles.isShown)}
          style={
            {
              left: pt.x,
              top: pt.y,
              "--tooltip": pt.color,
            } as CSSProperties
          }
        >
          {pt.text}
        </Link>
      ))}
    </div>
  );
};
