import type { Quadrant, Ring } from "@/lib/types";

type Position = [x: number, y: number];
type RingDimension = [innerRadius: number, outerRadius: number];

export default class Positioner {
  private readonly centerRadius: number;
  private readonly sweep: number;
  private readonly minDistance: number = 20;
  private readonly paddingRing: number = 15;
  private readonly paddingAngle: number = 10;
  private positions: Record<string, Position[]> = {};
  private ringDimensions: Record<string, RingDimension> = {};
  private quadrantAngles: Record<string, number> = {};

  constructor(size: number, quadrants: Quadrant[], rings: Ring[]) {
    this.centerRadius = size / 2;
    this.sweep = quadrants.length > 0 ? 360 / quadrants.length : 90;

    quadrants.forEach((quadrant) => {
      // Position 1 starts at 270°, each subsequent advances by sweep degrees
      this.quadrantAngles[quadrant.id] =
        (270 + (quadrant.position - 1) * this.sweep) % 360;
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
    quadrantId: string,
    ringId: string,
    radiusFraction: number,
    angleFraction: number,
  ): Position {
    const [innerRadius, outerRadius] = this.ringDimensions[ringId];
    const ringWidth = outerRadius - innerRadius;
    const absoluteRadius = innerRadius + radiusFraction * ringWidth;

    const startAngle = this.quadrantAngles[quadrantId] + this.paddingAngle;
    const endAngle = startAngle + this.sweep - 2 * this.paddingAngle;
    const absoluteAngle = startAngle + (endAngle - startAngle) * angleFraction;
    const angleInRadians = ((absoluteAngle - 90) * Math.PI) / 180;

    return [
      Math.round(this.centerRadius + absoluteRadius * Math.cos(angleInRadians)),
      Math.round(this.centerRadius + absoluteRadius * Math.sin(angleInRadians)),
    ];
  }

  public getNextPosition(quadrantId: string, ringId: string): Position {
    this.positions[quadrantId] ??= [];

    let tries = 0;
    let position: Position;

    do {
      position = this.getXYPosition(
        quadrantId,
        ringId,
        Math.sqrt(Math.random()),
        Math.random(),
      );
      tries++;
    } while (
      this.isOverlapping(position, this.positions[quadrantId]) &&
      tries < 150
    );

    if (tries >= 150) {
      console.warn(
        `Could not find a non-overlapping position for ${quadrantId} in ring ${ringId}`,
      );
    }

    this.positions[quadrantId].push(position);
    return position;
  }
}
