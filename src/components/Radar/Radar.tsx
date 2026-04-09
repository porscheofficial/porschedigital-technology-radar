import React, {
  CSSProperties,
  FC,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./Radar.module.scss";

import { Chart } from "@/components/Radar/Chart";
import { Label } from "@/components/Radar/Label";
import { Legend } from "@/components/Radar/Legend";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { Item, Quadrant, Ring } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PersistentTooltip {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

export interface RadarProps {
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
  const { highlightedIds } = useRadarHighlight();
  const [tooltip, setTooltip] = useState({
    show: false,
    text: "",
    color: "",
    x: 0,
    y: 0,
  });
  const [persistentTooltips, setPersistentTooltips] = useState<
    PersistentTooltip[]
  >([]);

  useEffect(() => {
    if (highlightedIds.length === 0 || !radarRef.current) {
      setPersistentTooltips([]);
      return;
    }

    const radarRect = radarRef.current.getBoundingClientRect();
    const tooltips: PersistentTooltip[] = [];

    for (const id of highlightedIds) {
      const link = radarRef.current.querySelector(
        `a[data-item-id="${id}"]`,
      ) as HTMLElement | null;
      if (!link) continue;

      const text = link.getAttribute("data-tooltip") || "";
      const color = link.getAttribute("data-tooltip-color") || "";
      const linkRect = link.getBoundingClientRect();

      tooltips.push({
        id,
        text,
        color,
        x: linkRect.left - radarRect.left + linkRect.width / 2,
        y: linkRect.top - radarRect.top,
      });
    }

    setPersistentTooltips(tooltips);
  }, [highlightedIds]);

  const tooltipStyle = useMemo(
    () =>
      ({
        left: tooltip.x,
        top: tooltip.y,
        ...(tooltip.color ? { "--tooltip": tooltip.color } : undefined),
      }) as CSSProperties,
    [tooltip],
  );

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (highlightedIds.length > 0) {
      if (tooltip.show) setTooltip({ ...tooltip, show: false });
      return;
    }
    const link =
      e.target instanceof Element && e.target.closest("a[data-tooltip]");
    if (link) {
      const text = link.getAttribute("data-tooltip") || "";
      const color = link.getAttribute("data-tooltip-color") || "";
      const linkRect = link.getBoundingClientRect();
      const radarRect = radarRef.current!.getBoundingClientRect();

      // Adjusting tooltip position to be relative to the radar container
      const x = linkRect.left - radarRect.left + linkRect.width / 2;
      const y = linkRect.top - radarRect.top;

      setTooltip({
        text,
        color,
        show: !!text,
        x,
        y,
      });
    } else {
      if (tooltip.show) {
        setTooltip({ ...tooltip, show: false });
      }
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ ...tooltip, show: false });
  };

  return (
    <div
      ref={radarRef}
      className={styles.radar}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Chart
        className={styles.chart}
        size={size}
        quadrants={quadrants}
        rings={rings}
        items={items}
      />
      <div className={styles.labels}>
        {quadrants.map((quadrant) => (
          <Label key={quadrant.id} quadrant={quadrant} />
        ))}
      </div>
      <Legend />
      <span
        className={cn(styles.tooltip, tooltip.show && styles.isShown)}
        style={tooltipStyle}
      >
        {tooltip.text}
      </span>
      {persistentTooltips.map((pt) => (
        <span
          key={pt.id}
          className={cn(styles.tooltip, styles.isShown)}
          style={
            {
              left: pt.x,
              top: pt.y,
              "--tooltip": pt.color,
            } as CSSProperties
          }
        >
          {pt.text}
        </span>
      ))}
    </div>
  );
};

export default Radar;
