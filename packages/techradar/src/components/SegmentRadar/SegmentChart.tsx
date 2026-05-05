import Link from "next/link";
import { type FC, memo, useMemo } from "react";
import { Blip } from "@/components/Radar/Blip";
import { getItemChangeDirection, getToggle } from "@/lib/data";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { describeFilledArc } from "@/lib/radarGeometry";
import { useTheme } from "@/lib/ThemeContext";
import { segmentForegroundVar } from "@/lib/theme/schema";
import { Flag, type Item, type Ring, type Segment } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./SegmentChart.module.scss";

const SEGMENT_PADDING_RATIO = 0.08;

export interface SegmentChartProps {
  /** Full radar size used during position generation (default 800). */
  size?: number;
  /** The single segment to render. */
  segment: Segment;
  /** All segments — needed to compute sweep angle (360/N). */
  allSegments: Segment[];
  rings: Ring[];
  items: Item[];
  /** Which ring IDs are currently "active" (visible in viewport). */
  activeRings?: Set<string>;
  className?: string;
}

const SegmentChartInner: FC<SegmentChartProps> = ({
  size = 800,
  segment,
  allSegments,
  rings = [],
  items = [],
  activeRings,
  className,
}) => {
  const { highlightedIds, filterActive } = useRadarHighlight();
  const { theme } = useTheme();
  const segmentColor = theme.radar.segments[segment.position - 1];
  const highlightSet = useMemo(() => new Set(highlightedIds), [highlightedIds]);
  const hasHighlights = filterActive || highlightSet.size > 0;

  const center = size / 2;
  const centerX = center;
  const centerY = center;
  const showBlipChange = getToggle("showBlipChange");
  const numSegments = allSegments.length;
  const sweep = numSegments > 0 ? 360 / numSegments : 90;
  const position = segment.position;

  const getStartAngle = (pos: number): number => {
    return (270 + (pos - 1) * sweep) % 360;
  };

  const startAngle = getStartAngle(position);
  const endAngle = startAngle + sweep;
  const midAngle = startAngle + sweep / 2;

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  const pad = size * SEGMENT_PADDING_RATIO;

  const samplePoints: { x: number; y: number }[] = [{ x: center, y: center }];
  for (let a = startAngle; a <= endAngle; a += sweep / 16) {
    const rad = toRad(a);
    samplePoints.push({
      x: center + center * Math.cos(rad),
      y: center + center * Math.sin(rad),
    });
  }
  const r1 = toRad(startAngle);
  samplePoints.push({
    x: center + center * Math.cos(r1),
    y: center + center * Math.sin(r1),
  });
  const r2 = toRad(endAngle);
  samplePoints.push({
    x: center + center * Math.cos(r2),
    y: center + center * Math.sin(r2),
  });

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of samplePoints) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const tightW = maxX - minX + pad * 2;
  const tightH = maxY - minY + pad * 2;
  const side = Math.max(tightW, tightH);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const vbX = cx - side / 2;
  const vbY = cy - side / 2;
  const vbW = side;
  const vbH = side;

  const polarToCartesian = (
    radius: number,
    angleInDegrees: number,
  ): { x: number; y: number } => {
    const rad = toRad(angleInDegrees);
    return {
      x: Math.round(center + radius * Math.cos(rad)),
      y: Math.round(center + radius * Math.sin(rad)),
    };
  };

  const describeArc = (radiusPercentage: number): string => {
    const radius = radiusPercentage * center;
    const start = polarToCartesian(radius, endAngle);
    const end = polarToCartesian(radius, startAngle);
    const largeArcFlag = sweep > 180 ? 1 : 0;

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

  const renderGlow = () => {
    const gradientId = `qc-glow-${position}`;
    const midRad = toRad(midAngle);
    const dirX = Math.cos(midRad);
    const dirY = Math.sin(midRad);

    const rectW = center;
    const rectH = center;
    const rectX = dirX >= 0 ? center : 0;
    const rectY = dirY >= 0 ? center : 0;

    return (
      <>
        <defs>
          <radialGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            cx={center}
            cy={center}
            r={center}
          >
            <stop offset="0%" stopColor={segmentColor} stopOpacity={0.5} />
            <stop offset="100%" stopColor={segmentColor} stopOpacity={0} />
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

  const renderRingHighlights = () => {
    if (!activeRings || activeRings.size === 0) return null;
    return rings.map((ring, index) => {
      if (!activeRings.has(ring.id)) return null;
      const innerRadius = (rings[index - 1]?.radius || 0) * center;
      const outerRadius = (ring.radius || 1) * center;
      return (
        <path
          key={`ring-hl-${ring.id}`}
          d={describeFilledArc(
            center,
            center,
            innerRadius,
            outerRadius,
            startAngle,
            endAngle,
          )}
          fill={segmentColor}
          opacity={0.08}
          className={styles.ringHighlight}
        />
      );
    });
  };

  const renderRingLabels = () => {
    return rings.map((ring, index) => {
      const outerRadius = ring.radius || 1;
      const innerRadius = rings[index - 1]?.radius || 0;
      const midRadius = ((outerRadius + innerRadius) / 2) * center;

      const p = polarToCartesian(midRadius, midAngle);

      return (
        <text
          key={ring.id}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          className={cn(
            styles.ringLabel,
            activeRings?.has(ring.id) && styles.ringLabelActive,
          )}
        >
          {ring.title}
        </text>
      );
    });
  };

  const renderItem = (item: Item) => {
    const ring = rings.find((r) => r.id === item.ring);
    if (!ring) return null;
    const [x, y] = item.position;
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
        data-tooltip-color={segmentColor}
        data-tooltip-fg={segmentForegroundVar(segment.position - 1)}
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
          color={segmentColor}
          direction={direction ?? undefined}
          centerX={direction ? centerX : undefined}
          centerY={direction ? centerY : undefined}
          x={x}
          y={y}
        />
      </Link>
    );
  };

  const renderBoundaryLines = () => {
    const outerR = center;
    const s = polarToCartesian(outerR, startAngle);
    const e = polarToCartesian(outerR, endAngle);
    return (
      <g opacity={0.15}>
        <line
          x1={center}
          y1={center}
          x2={s.x}
          y2={s.y}
          stroke={segmentColor}
          strokeWidth={1}
        />
        <line
          x1={center}
          y1={center}
          x2={e.x}
          y2={e.y}
          stroke={segmentColor}
          strokeWidth={1}
        />
      </g>
    );
  };

  return (
    <svg
      className={className}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Segment radar chart"
    >
      {renderGlow()}
      {renderRingHighlights()}
      {rings.map((ring) => (
        <path
          key={ring.id}
          d={describeArc(ring.radius || 0.5)}
          fill="none"
          stroke={segmentColor}
          strokeWidth={ring.strokeWidth || 2}
        />
      ))}
      {renderBoundaryLines()}
      <g className={styles.ringLabels}>{renderRingLabels()}</g>
      <g className={styles.items}>{items.map((item) => renderItem(item))}</g>
    </svg>
  );
};

export const SegmentChart = memo(SegmentChartInner);
