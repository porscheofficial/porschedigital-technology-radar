import Link from "next/link";
import React, {
  CSSProperties,
  FC,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./QuadrantRadar.module.scss";

import { QuadrantChart } from "@/components/QuadrantRadar/QuadrantChart";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { Item, Quadrant, Ring } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PersistentTooltip {
  id: string;
  text: string;
  color: string;
  href: string;
  x: number;
  y: number;
}

export interface QuadrantRadarProps {
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
  const { highlightedIds, filterActive } = useRadarHighlight();
  const [tooltip, setTooltip] = useState({
    show: false,
    text: "",
    color: "",
    x: 0,
    y: 0,
  });
  const [tooltipMap, setTooltipMap] = useState<Map<string, PersistentTooltip>>(
    new Map(),
  );
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());
  const activeIdsRef = useRef(new Set<string>());
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const currentHighlightSet = new Set(highlightedIds);
    activeIdsRef.current = currentHighlightSet;

    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    if (currentHighlightSet.size === 0) {
      setShownIds(new Set());
      cleanupTimerRef.current = setTimeout(() => {
        setTooltipMap(new Map());
      }, 200);
      return;
    }

    if (!radarRef.current) return;

    const radarRect = radarRef.current.getBoundingClientRect();
    const next = new Map<string, PersistentTooltip>();

    for (const id of currentHighlightSet) {
      const link = radarRef.current.querySelector(
        `a[data-item-id="${id}"]`,
      ) as HTMLElement | null;
      if (!link) continue;

      const text = link.getAttribute("data-tooltip") || "";
      const color = link.getAttribute("data-tooltip-color") || "";
      const href = link.getAttribute("href") || "";
      const linkRect = link.getBoundingClientRect();

      next.set(id, {
        id,
        text,
        color,
        href,
        x: linkRect.left - radarRect.left + linkRect.width / 2,
        y: linkRect.top - radarRect.top,
      });
    }

    setTooltipMap((prev) => {
      const merged = new Map(prev);
      for (const [id, tt] of next) {
        merged.set(id, tt);
      }
      for (const id of merged.keys()) {
        if (!next.has(id)) {
          setTimeout(() => {
            setTooltipMap((current) => {
              if (activeIdsRef.current.has(id)) return current;
              const updated = new Map(current);
              updated.delete(id);
              return updated;
            });
          }, 200);
        }
      }
      return merged;
    });

    setShownIds((prev) => {
      const kept = new Set<string>();
      for (const id of prev) {
        if (currentHighlightSet.has(id)) kept.add(id);
      }
      return kept;
    });

    rafRef.current = requestAnimationFrame(() => {
      setShownIds(new Set(currentHighlightSet));
    });
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
    if (filterActive || highlightedIds.length > 0) {
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

      const x = linkRect.left - radarRect.left + linkRect.width / 2;
      const y = linkRect.top - radarRect.top;

      setTooltip({ text, color, show: !!text, x, y });
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
      className={styles.quadrantRadar}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
