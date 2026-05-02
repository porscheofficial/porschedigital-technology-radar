import type { Ring, Segment } from "@/lib/types";

type Position = [x: number, y: number];
type RingDimension = [innerRadius: number, outerRadius: number];

const MAX_PLACEMENT_ATTEMPTS = 150;

export default class Positioner {
  private readonly centerRadius: number;
  private readonly sweep: number;
  private readonly minDistance: number = 20;
  private readonly paddingRing: number = 15;
  private readonly paddingAngle: number = 10;
  private positions: Record<string, Position[]> = {};
  private ringDimensions: Record<string, RingDimension> = {};
  private segmentAngles: Record<string, number> = {};

  constructor(size: number, segments: Segment[], rings: Ring[]) {
    this.centerRadius = size / 2;
    this.sweep = segments.length > 0 ? 360 / segments.length : 90;

    segments.forEach((segment) => {
      // Position 1 starts at 270°, each subsequent advances by sweep degrees
      this.segmentAngles[segment.id] =
        (270 + (segment.position - 1) * this.sweep) % 360;
    });

    rings.forEach((ring, index) => {
      const innerRadius =
        (rings[index - 1]?.radius ?? 0) * this.centerRadius + this.paddingRing;
      const outerRadius =
        (ring.radius ?? 1) * this.centerRadius - this.paddingRing;
      this.ringDimensions[ring.id] = [innerRadius, outerRadius];
    });
  }

  static getDistance(a: Position, b: Position): number {
    const [x1, y1] = a;
    const [x2, y2] = b;
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }

  private isOverlapping(position: Position, positions: Position[]): boolean {
    return positions.some(
      (p) => Positioner.getDistance(position, p) < this.minDistance,
    );
  }

  private getXYPosition(
    segmentId: string,
    ringId: string,
    radiusFraction: number,
    angleFraction: number,
  ): Position {
    const [innerRadius, outerRadius] = this.ringDimensions[ringId];
    const ringWidth = outerRadius - innerRadius;
    const absoluteRadius = innerRadius + radiusFraction * ringWidth;

    const startAngle = this.segmentAngles[segmentId] + this.paddingAngle;
    const endAngle = startAngle + this.sweep - 2 * this.paddingAngle;
    const absoluteAngle = startAngle + (endAngle - startAngle) * angleFraction;
    const angleInRadians = ((absoluteAngle - 90) * Math.PI) / 180;

    return [
      Math.round(this.centerRadius + absoluteRadius * Math.cos(angleInRadians)),
      Math.round(this.centerRadius + absoluteRadius * Math.sin(angleInRadians)),
    ];
  }

  public getNextPosition(segmentId: string, ringId: string): Position {
    this.positions[segmentId] ??= [];

    let tries = 0;
    let position: Position;

    do {
      position = this.getXYPosition(
        segmentId,
        ringId,
        Math.sqrt(Math.random()),
        Math.random(),
      );
      tries++;
    } while (
      this.isOverlapping(position, this.positions[segmentId]) &&
      tries < MAX_PLACEMENT_ATTEMPTS
    );

    if (tries >= MAX_PLACEMENT_ATTEMPTS) {
      console.warn(
        `Could not find a non-overlapping position for ${segmentId} in ring ${ringId}`,
      );
    }

    this.positions[segmentId].push(position);
    return position;
  }
}
