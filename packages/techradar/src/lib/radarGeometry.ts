interface Point {
  x: number;
  y: number;
}

/**
 * Convert polar coordinates to Cartesian coordinates relative to a center point.
 *
 * Angles are measured in degrees. 0° points to the top of the circle (12 o'clock),
 * 90° to the right (3 o'clock), 180° to the bottom, 270° to the left.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number,
): Point {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: Math.round(cx + radius * Math.cos(angleInRadians)),
    y: Math.round(cy + radius * Math.sin(angleInRadians)),
  };
}

/**
 * Build an SVG path `d` string for a filled annular wedge
 * (segment-of-a-ring) centred at (cx, cy).
 *
 * The path traces: outer arc (visually clockwise from startAngle to
 * endAngle) → straight line inward → inner arc (visually counter-clockwise
 * back) → close. Both arcs use SVG `sweep-flag=0` because the radar's
 * angle convention has 0° at the top and increases clockwise (matching
 * `polarToCartesian` above), and SVG's Y-down coordinate system inverts
 * the math sweep direction so flag=0 traces visually clockwise.
 */
export function describeFilledArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep > 180 ? 1 : 0;

  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerStart.x,
    innerStart.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    innerEnd.x,
    innerEnd.y,
    "Z",
  ].join(" ");
}

/**
 * Build an SVG path `d` string for a filled pie-wedge (sector) — i.e. a
 * triangle-like slice from `(cx, cy)` out along `startAngle`, around the
 * outer arc to `endAngle`, and back to the centre.
 *
 * This is the correct clipping shape for a per-segment radial glow: it
 * follows the segment's actual angular bounds for any segment count,
 * unlike an axis-aligned half-rect which only happens to match 4-segment
 * layouts whose mid-directions are pure diagonals.
 */
/**
 * Compute the start angle (in degrees, 0° = top, increasing clockwise) of a
 * radar segment given its 1-indexed `position` and the total `numSegments`.
 *
 * Parity-aware orientation:
 * - Even N: a segment *boundary* sits at 12 o'clock — segment 1 starts at
 *   `(360 - sweep) % 360`, so e.g. for N=4 (sweep=90°) position 1 starts at
 *   270° (left), preserving the historical 4-segment layout where boundaries
 *   land on the cardinal axes.
 * - Odd N: segment 1 is *centred* at 12 o'clock — its start angle is
 *   `(360 - sweep / 2) % 360`. This keeps odd-segment radars visually
 *   symmetric about the vertical axis (e.g. N=5 puts the top segment
 *   straight up with a vertical boundary at the bottom).
 */
export function computeSegmentStartAngle(
  position: number,
  numSegments: number,
): number {
  if (numSegments <= 0) return 0;
  const sweep = 360 / numSegments;
  const firstStart =
    numSegments % 2 === 0 ? (360 - sweep) % 360 : (360 - sweep / 2) % 360;
  return (firstStart + (position - 1) * sweep) % 360;
}

export function describePieWedge(
  cx: number,
  cy: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep > 180 ? 1 : 0;

  const arcStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const arcEnd = polarToCartesian(cx, cy, outerRadius, endAngle);

  return [
    "M",
    cx,
    cy,
    "L",
    arcStart.x,
    arcStart.y,
    "A",
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    1,
    arcEnd.x,
    arcEnd.y,
    "Z",
  ].join(" ");
}
