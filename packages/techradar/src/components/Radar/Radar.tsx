import {
  type CSSProperties,
  type FC,
  useCallback,
  useRef,
  useState,
} from "react";
import { Chart } from "@/components/Radar/Chart";
import { useRadarTooltip } from "@/hooks/useRadarTooltip";
import type { Item, Ring, Segment } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./Radar.module.scss";

interface RadarProps {
  size?: number;
  segments: Segment[];
  rings: Ring[];
  items: Item[];
}

export const Radar: FC<RadarProps> = ({
  size = 800,
  segments = [],
  rings = [],
  items = [],
}) => {
  const radarRef = useRef<HTMLDivElement>(null);
  const [frozenIds, setFrozenIds] = useState<ReadonlyArray<string> | null>(
    null,
  );
  const handleWedgeCommit = useCallback((ids: string[]) => {
    setFrozenIds((prev) => prev ?? ids);
  }, []);
  const {
    tooltip,
    tooltipStyle,
    tooltipMap,
    shownIds,
    handleMouseMove,
    handleMouseLeave,
  } = useRadarTooltip(radarRef, frozenIds);

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
        segments={segments}
        rings={rings}
        items={items}
        onWedgeCommit={handleWedgeCommit}
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
