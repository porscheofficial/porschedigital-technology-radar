interface Point {
  x: number;
  y: number;
}

/**
 * Convert polar coordinates to Cartesian coordinates relative to a center point.
 *
 * Angles are measured in degrees. 0° points to the top of the circle (12 o'clock),
 * 90° to the right (3 o'clock), 180° to the bottom, 270° to the left — matching
 * the radar's segment positioning convention.
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
