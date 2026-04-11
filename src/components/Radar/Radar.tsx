import { type CSSProperties, type FC, useRef } from "react";
import { Chart } from "@/components/Radar/Chart";
import { useRadarTooltip } from "@/hooks/useRadarTooltip";
import type { Item, Quadrant, Ring } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./Radar.module.scss";

interface RadarProps {
  size?: number;
  quadrants: Quadrant[];
  rings: Ring[];
  items: Item[];
}

export const Radar: FC<RadarProps> = ({
  size = 800,
  quadrants = [],
  rings = [],
  items = [],
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
      className={styles.radar}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label="Technology radar"
    >
      <Chart
        className={styles.chart}
        size={size}
        quadrants={quadrants}
        rings={rings}
        items={items}
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
            } as CSSProperties
          }
        >
          {pt.text}
        </a>
      ))}
    </div>
  );
};
