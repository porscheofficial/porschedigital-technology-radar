import { type CSSProperties, type FC, useRef } from "react";
import { SegmentChart } from "@/components/SegmentRadar/SegmentChart";
import { useRadarTooltip } from "@/hooks/useRadarTooltip";
import type { Item, Ring, Segment } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./SegmentRadar.module.scss";

interface SegmentRadarProps {
  segment: Segment;
  allSegments: Segment[];
  rings: Ring[];
  items: Item[];
  activeRings?: Set<string>;
}

export const SegmentRadar: FC<SegmentRadarProps> = ({
  segment,
  allSegments,
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
      className={styles.segmentRadar}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label="Segment radar"
    >
      <SegmentChart
        className={styles.chart}
        segment={segment}
        allSegments={allSegments}
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
        <a
          key={pt.id}
          href={pt.href}
          data-item-id={pt.id}
          className={cn(styles.tooltip, shownIds.has(pt.id) && styles.isShown)}
          style={
            {
              left: pt.x,
              top: pt.y,
              "--tooltip": pt.color,
              "--tooltip-fg": pt.colorFg,
            } as CSSProperties
          }
        >
          {pt.text}
        </a>
      ))}
    </div>
  );
};
