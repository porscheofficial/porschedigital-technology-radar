import Link from "next/link";
import { type FC, Fragment, memo, useMemo, useRef } from "react";
import { Blip } from "@/components/Radar/Blip";
import { getItemChangeDirection, getToggle } from "@/lib/data";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { describeFilledArc } from "@/lib/radarGeometry";
import { Flag, type Item, type Ring, type Segment } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./Chart.module.scss";

const CHART_PADDING_RATIO = 0.09;
const LABEL_PADDING_RATIO = 0.55;

export interface ChartProps {
  size?: number;
  segments: Segment[];
  rings: Ring[];
  items: Item[];
  className?: string;
}

interface WedgeProps {
  segmentId: string;
  segmentColor: string;
  ringId: string;
  d: string;
  ids: string[];
  ariaLabel: string;
  onPreview: (ids: string[]) => void;
}

const Wedge: FC<WedgeProps> = ({
  segmentId,
  segmentColor,
  ringId,
  d,
  ids,
  ariaLabel,
  onPreview,
}) => {
  // Once a click has been committed and navigation is in flight, ignore any
  // mouseLeave/blur events that would otherwise clear the highlight and cause
  // a visible "all blips equal" flash before the new page renders.
  const committedRef = useRef(false);
  const enter = () => {
    if (committedRef.current) return;
    onPreview(ids);
  };
  const leave = () => {
    if (committedRef.current) return;
    onPreview([]);
  };
  // Reuse preview semantics on commit (suppressTooltips=true) so persistent
  // labels don't appear for every blip in the wedge after navigation. Touch
  // taps that skip hover still get state set here; the committedRef gate
  // prevents any subsequent blur from clearing it.
  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onPreview(ids);
  };
  return (
    <Link
      href={`/${segmentId}#ring-${ringId}`}
      aria-label={ariaLabel}
      className={styles.wedge}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      onPointerDown={commit}
      onClick={commit}
    >
      <path
        d={d}
        fill={segmentColor}
        data-segment={segmentId}
        data-ring={ringId}
      />
    </Link>
  );
};

const ChartInner: FC<ChartProps> = ({
  size = 800,
  segments = [],
  rings = [],
  items = [],
  className,
}) => {
  const { highlightedIds, filterActive, setHighlightPreview } =
    useRadarHighlight();
  const highlightSet = useMemo(() => new Set(highlightedIds), [highlightedIds]);
  const hasHighlights = filterActive || highlightSet.size > 0;
  const center = size / 2;
  const padding = size * CHART_PADDING_RATIO;
  const viewBoxSize = size + padding * 2;
  const viewBoxCenter = viewBoxSize / 2;
  const centerX = viewBoxCenter;
  const centerY = viewBoxCenter;
  const showBlipChange = getToggle("showBlipChange");

  const numSegments = segments.length;
  const sweep = numSegments > 0 ? 360 / numSegments : 90;

  const itemsBySegmentRing = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of items) {
      const key = `${item.segment}::${item.ring}`;
      const list = map.get(key);
      if (list) list.push(item.id);
      else map.set(key, [item.id]);
    }
    return map;
  }, [items]);

  // Compute start angle for each segment position (1-indexed).
  // Position 1 starts at 270° (top-left for 4 segments), each subsequent
  // segment advances by `sweep` degrees clockwise.
  const getStartAngle = (position: number): number => {
    return (270 + (position - 1) * sweep) % 360;
  };

  const polarToCartesian = (
    radius: number,
    angleInDegrees: number,
  ): { x: number; y: number } => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: Math.round(viewBoxCenter + radius * Math.cos(angleInRadians)),
      y: Math.round(viewBoxCenter + radius * Math.sin(angleInRadians)),
    };
  };

  const describeArc = (radiusPercentage: number, position: number): string => {
    const startAngle = getStartAngle(position);
    const endAngle = startAngle + sweep;

    const radius = radiusPercentage * center;
    const start = polarToCartesian(radius, endAngle);
    const end = polarToCartesian(radius, startAngle);

    const largeArcFlag = sweep > 180 ? 1 : 0;

    // prettier-ignore
    return [
      "M",
      start.x,
      start.y,
      "A",
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  const renderGlow = (position: number, color: string) => {
    const gradientId = `glow-${position}`;
    const startAngle = getStartAngle(position);
    const midAngle = startAngle + sweep / 2;
    const midRad = ((midAngle - 90) * Math.PI) / 180;

    const dirX = Math.cos(midRad);
    const dirY = Math.sin(midRad);

    // Rect from SVG edge to radar center; gradient radiates from center outward
    const rectW = viewBoxCenter;
    const rectH = viewBoxCenter;
    const rectX = dirX >= 0 ? viewBoxCenter : 0;
    const rectY = dirY >= 0 ? viewBoxCenter : 0;
    return (
      <>
        <defs>
          <radialGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            cx={viewBoxCenter}
            cy={viewBoxCenter}
            r={center}
          >
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect
          width={rectW}
          height={rectH}
          x={rectX}
          y={rectY}
          fill={`url(#${gradientId})`}
        />
      </>
    );
  };

  const renderItem = (item: Item) => {
    const ring = rings.find((r) => r.id === item.ring);
    const segment = segments.find((q) => q.id === item.segment);
    if (!ring || !segment) return null;
    const [x, y] = item.position;
    const bx = x + padding;
    const by = y + padding;
    const direction =
      showBlipChange && item.flag === Flag.Changed
        ? getItemChangeDirection(item)
        : undefined;

    const isHighlighted = highlightSet.has(item.id);
    const isDimmed = hasHighlights && !isHighlighted;

    return (
      <Link
        key={item.id}
        href={`/${item.segment}/${item.id}`}
        aria-label={item.title}
        data-tooltip={item.title}
        data-tooltip-color={segment.color}
        data-item-id={item.id}
        className={cn(
          hasHighlights && styles.blip,
          isHighlighted && styles.highlighted,
          isDimmed && styles.dimmed,
        )}
        tabIndex={-1}
      >
        <Blip
          flag={item.flag}
          color={segment.color}
          direction={direction ?? undefined}
          centerX={direction ? centerX : undefined}
          centerY={direction ? centerY : undefined}
          x={bx}
          y={by}
        />
      </Link>
    );
  };

  const renderRingLabels = () => {
    // Place ring labels along each segment boundary line.
    // For N segments we place labels on the first boundary (position 1 start angle).
    // We also place a mirrored set on the opposite boundary for readability.
    const labelAngle = getStartAngle(1);
    const oppositeAngle = (labelAngle + 180) % 360;

    return rings.map((ring, index) => {
      const outerRadius = ring.radius || 1;
      const innerRadius = rings[index - 1]?.radius || 0;
      const midRadius = ((outerRadius + innerRadius) / 2) * center;

      const p1 = polarToCartesian(midRadius, labelAngle);
      const p2 = polarToCartesian(midRadius, oppositeAngle);

      return (
        <Fragment key={ring.id}>
          <text
            x={p1.x}
            y={p1.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
          >
            {ring.title}
          </text>
          <text
            x={p2.x}
            y={p2.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
          >
            {ring.title}
          </text>
        </Fragment>
      );
    });
  };

  const renderSegmentLabels = () => {
    const labelRadius = center + padding * LABEL_PADDING_RATIO;

    return segments.map((segment) => {
      const pos = segment.position;
      const startAngle = getStartAngle(pos);
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;
      const pathId = `segment-arc-${pos}`;

      // Determine if the arc midpoint is in the bottom half (90°–270° range).
      // For bottom arcs, we reverse the path direction so text reads left-to-right.
      const normMid = ((midAngle % 360) + 360) % 360;
      const isBottom = normMid > 90 && normMid < 270;

      let d: string;
      const largeArcFlag = sweep > 180 ? 1 : 0;
      if (isBottom) {
        const start = polarToCartesian(labelRadius, endAngle);
        const end = polarToCartesian(labelRadius, startAngle);
        d = `M ${start.x} ${start.y} A ${labelRadius} ${labelRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
      } else {
        const start = polarToCartesian(labelRadius, startAngle);
        const end = polarToCartesian(labelRadius, endAngle);
        d = `M ${start.x} ${start.y} A ${labelRadius} ${labelRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
      }

      return (
        <g key={pathId}>
          <defs>
            <path id={pathId} d={d} fill="none" />
          </defs>
          <Link href={`/${segment.id}`} className={styles.segmentLabel}>
            <text>
              <textPath
                href={`#${pathId}`}
                startOffset="50%"
                textAnchor="middle"
                fill={segment.color}
                fontSize="20"
                fontWeight="700"
                letterSpacing="0.12em"
              >
                {segment.title.toUpperCase()}
              </textPath>
            </text>
          </Link>
        </g>
      );
    });
  };

  const renderWedges = () => {
    return segments.flatMap((segment) => {
      const startAngle = getStartAngle(segment.position);
      const endAngle = startAngle + sweep;
      return rings.map((ring, index) => {
        const innerRadius = (rings[index - 1]?.radius ?? 0) * center;
        const outerRadius = (ring.radius ?? 1) * center;
        const d = describeFilledArc(
          viewBoxCenter,
          viewBoxCenter,
          innerRadius,
          outerRadius,
          startAngle,
          endAngle,
        );
        const ids = itemsBySegmentRing.get(`${segment.id}::${ring.id}`) ?? [];
        const itemWord = ids.length === 1 ? "item" : "items";
        const ariaLabel = `${segment.title}, ${ring.title} (${ids.length} ${itemWord})`;
        return (
          <Wedge
            key={`wedge-${segment.id}-${ring.id}`}
            segmentId={segment.id}
            segmentColor={segment.color}
            ringId={ring.id}
            d={d}
            ids={ids}
            ariaLabel={ariaLabel}
            onPreview={setHighlightPreview}
          />
        );
      });
    });
  };

  return (
    <svg
      className={className}
      width={viewBoxSize}
      height={viewBoxSize}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      role="img"
      aria-label="Technology radar chart"
    >
      {segments.map((segment) => (
        <g key={segment.id} data-segment={segment.id}>
          {renderGlow(segment.position, segment.color)}
          {rings.map((ring) => (
            <path
              key={`${ring.id}-${segment.id}`}
              data-key={`${ring.id}-${segment.id}`}
              d={describeArc(ring.radius || 0.5, segment.position)}
              fill="none"
              stroke={segment.color}
              strokeWidth={ring.strokeWidth || 2}
            />
          ))}
        </g>
      ))}
      <g className={styles.wedges}>{renderWedges()}</g>
      <g className={styles.ringLabels}>{renderRingLabels()}</g>
      <g className={styles.items}>{items.map((item) => renderItem(item))}</g>
      <g>{renderSegmentLabels()}</g>
    </svg>
  );
};

export const Chart = memo(ChartInner);
