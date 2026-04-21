import Link from "next/link";
import { type FC, Fragment, memo, useMemo } from "react";
import { Blip } from "@/components/Radar/Blip";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import type { Item, Quadrant, Ring } from "@/lib/types";
import { assetUrl, cn } from "@/lib/utils";
import styles from "./Chart.module.scss";

const CHART_PADDING_RATIO = 0.09;
const LABEL_PADDING_RATIO = 0.55;

export interface ChartProps {
  size?: number;
  quadrants: Quadrant[];
  rings: Ring[];
  items: Item[];
  className?: string;
}

const ChartInner: FC<ChartProps> = ({
  size = 800,
  quadrants = [],
  rings = [],
  items = [],
  className,
}) => {
  const { highlightedIds, filterActive } = useRadarHighlight();
  const highlightSet = useMemo(() => new Set(highlightedIds), [highlightedIds]);
  const hasHighlights = filterActive || highlightSet.size > 0;
  const center = size / 2;
  const padding = size * CHART_PADDING_RATIO;
  const viewBoxSize = size + padding * 2;
  const viewBoxCenter = viewBoxSize / 2;

  const numQuadrants = quadrants.length;
  const sweep = numQuadrants > 0 ? 360 / numQuadrants : 90;

  // Compute start angle for each quadrant position (1-indexed).
  // Position 1 starts at 270° (top-left for 4 quadrants), each subsequent
  // quadrant advances by `sweep` degrees clockwise.
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
    const quadrant = quadrants.find((q) => q.id === item.quadrant);
    if (!ring || !quadrant) return null;
    const [x, y] = item.position;
    const bx = x + padding;
    const by = y + padding;

    const isHighlighted = highlightSet.has(item.id);
    const isDimmed = hasHighlights && !isHighlighted;

    return (
      <Link
        key={item.id}
        href={`/${item.quadrant}/${item.id}`}
        data-tooltip={item.title}
        data-tooltip-color={quadrant.color}
        data-item-id={item.id}
        className={cn(
          hasHighlights && styles.blip,
          isHighlighted && styles.highlighted,
          isDimmed && styles.dimmed,
        )}
        tabIndex={-1}
      >
        <Blip flag={item.flag} color={quadrant.color} x={bx} y={by} />
      </Link>
    );
  };

  const renderRingLabels = () => {
    // Place ring labels along each quadrant boundary line.
    // For N quadrants we place labels on the first boundary (position 1 start angle).
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

  const renderQuadrantLabels = () => {
    const labelRadius = center + padding * LABEL_PADDING_RATIO;

    return quadrants.map((quadrant) => {
      const pos = quadrant.position;
      const startAngle = getStartAngle(pos);
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;
      const pathId = `quadrant-arc-${pos}`;

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
          <a
            href={assetUrl(`/${quadrant.id}`)}
            className={styles.quadrantLabel}
          >
            <text>
              <textPath
                href={`#${pathId}`}
                startOffset="50%"
                textAnchor="middle"
                fill={quadrant.color}
                fontSize="20"
                fontWeight="700"
                letterSpacing="0.12em"
              >
                {quadrant.title.toUpperCase()}
              </textPath>
            </text>
          </a>
        </g>
      );
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
      <title>Technology radar chart</title>
      {quadrants.map((quadrant) => (
        <g key={quadrant.id} data-quadrant={quadrant.id}>
          {renderGlow(quadrant.position, quadrant.color)}
          {rings.map((ring) => (
            <path
              key={`${ring.id}-${quadrant.id}`}
              data-key={`${ring.id}-${quadrant.id}`}
              d={describeArc(ring.radius || 0.5, quadrant.position)}
              fill="none"
              stroke={quadrant.color}
              strokeWidth={ring.strokeWidth || 2}
            />
          ))}
        </g>
      ))}
      <g className={styles.ringLabels}>{renderRingLabels()}</g>
      <g className={styles.items}>{items.map((item) => renderItem(item))}</g>
      <g>{renderQuadrantLabels()}</g>
    </svg>
  );
};

export const Chart = memo(ChartInner);
