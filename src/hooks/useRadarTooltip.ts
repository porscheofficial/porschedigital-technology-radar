import {
  type CSSProperties,
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";

const TOOLTIP_CLEANUP_DELAY_MS = 200;

export interface PersistentTooltip {
  id: string;
  text: string;
  color: string;
  href: string;
  x: number;
  y: number;
}

interface TooltipState {
  show: boolean;
  text: string;
  color: string;
  x: number;
  y: number;
}

const INITIAL_TOOLTIP: TooltipState = {
  show: false,
  text: "",
  color: "",
  x: 0,
  y: 0,
};

export function useRadarTooltip(
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const { highlightedIds, filterActive } = useRadarHighlight();

  const [tooltip, setTooltip] = useState<TooltipState>(INITIAL_TOOLTIP);
  const [tooltipMap, setTooltipMap] = useState<Map<string, PersistentTooltip>>(
    new Map(),
  );
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());

  const activeIdsRef = useRef(new Set<string>());
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const mouseMoveRafRef = useRef(0);

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
      rafRef.current = requestAnimationFrame(() => {
        setShownIds(new Set());
      });
      cleanupTimerRef.current = setTimeout(() => {
        setTooltipMap(new Map());
      }, TOOLTIP_CLEANUP_DELAY_MS);
      return;
    }

    if (!containerRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const radarRect = containerRef.current.getBoundingClientRect();
      const next = new Map<string, PersistentTooltip>();

      for (const id of currentHighlightSet) {
        const link = containerRef.current.querySelector(
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
            }, TOOLTIP_CLEANUP_DELAY_MS);
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

      requestAnimationFrame(() => {
        setShownIds(new Set(currentHighlightSet));
      });
    });
  }, [highlightedIds, containerRef]);

  const tooltipStyle = useMemo(
    () =>
      ({
        left: tooltip.x,
        top: tooltip.y,
        ...(tooltip.color ? { "--tooltip": tooltip.color } : undefined),
      }) as CSSProperties,
    [tooltip],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (filterActive || highlightedIds.length > 0) {
        if (tooltip.show) setTooltip((prev) => ({ ...prev, show: false }));
        return;
      }
      const target = e.target;
      const link =
        target instanceof Element && target.closest("a[data-tooltip]");

      if (!link) {
        if (tooltip.show) setTooltip((prev) => ({ ...prev, show: false }));
        return;
      }

      if (mouseMoveRafRef.current) return;
      mouseMoveRafRef.current = requestAnimationFrame(() => {
        mouseMoveRafRef.current = 0;
        if (!containerRef.current) return;
        const text = link.getAttribute("data-tooltip") || "";
        const color = link.getAttribute("data-tooltip-color") || "";
        const linkRect = link.getBoundingClientRect();
        const radarRect = containerRef.current.getBoundingClientRect();

        const x = linkRect.left - radarRect.left + linkRect.width / 2;
        const y = linkRect.top - radarRect.top;

        setTooltip({ text, color, show: !!text, x, y });
      });
    },
    [filterActive, highlightedIds.length, tooltip.show, containerRef],
  );

  const handleMouseLeave = useCallback(() => {
    if (mouseMoveRafRef.current) {
      cancelAnimationFrame(mouseMoveRafRef.current);
      mouseMoveRafRef.current = 0;
    }
    setTooltip((prev) => ({ ...prev, show: false }));
  }, []);

  return {
    tooltip,
    tooltipStyle,
    tooltipMap,
    shownIds,
    handleMouseMove,
    handleMouseLeave,
  };
}
