import type { Quadrant, Ring } from "@/lib/types";
import Positioner from "../positioner";

function createQuadrants(): Quadrant[] {
  return [
    {
      id: "languages-and-frameworks",
      title: "Languages & Frameworks",
      description: "",
      color: "#4A9E7E",
      position: 1,
    },
    {
      id: "methods-and-patterns",
      title: "Methods & Patterns",
      description: "",
      color: "#5B8DB8",
      position: 2,
    },
    {
      id: "platforms-and-operations",
      title: "Platforms & Operations",
      description: "",
      color: "#C4A85E",
      position: 3,
    },
    {
      id: "tools",
      title: "Tools",
      description: "",
      color: "#B85B5B",
      position: 4,
    },
  ];
}

function createRings(): Ring[] {
  return [
    {
      id: "adopt",
      title: "Adopt",
      description: "",
      color: "#4A9E7E",
      radius: 0.5,
    },
    {
      id: "trial",
      title: "Trial",
      description: "",
      color: "#5B8DB8",
      radius: 0.69,
    },
    {
      id: "assess",
      title: "Assess",
      description: "",
      color: "#C4A85E",
      radius: 0.85,
    },
    {
      id: "hold",
      title: "Hold",
      description: "",
      color: "#B85B5B",
      radius: 1,
    },
  ];
}

function getPolar(position: [number, number], size: number) {
  const center = size / 2;
  const [x, y] = position;
  const dx = x - center;
  const dy = y - center;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return {
    distance,
    angle: (angle + 360) % 360,
  };
}

describe("Positioner", () => {
  const size = 800;
  const center = size / 2;
  const quadrants = createQuadrants();
  const rings = createRings();

  it("computes Euclidean distance", () => {
    expect(Positioner.getDistance([0, 0], [3, 4])).toBe(5);
    expect(Positioner.getDistance([5, 5], [5, 5])).toBe(0);
  });

  it("constructor computes ring dimensions and quadrant angles", () => {
    const positioner = new Positioner(size, quadrants, rings);
    const internal = positioner as unknown as {
      ringDimensions: Record<string, [number, number]>;
      quadrantAngles: Record<string, number>;
      sweep: number;
      centerRadius: number;
    };

    expect(internal.centerRadius).toBe(400);
    expect(internal.sweep).toBe(90);
    expect(internal.quadrantAngles).toEqual({
      "languages-and-frameworks": 270,
      "methods-and-patterns": 0,
      "platforms-and-operations": 90,
      tools: 180,
    });
    expect(internal.ringDimensions.adopt).toEqual([15, 185]);
    expect(internal.ringDimensions.trial).toEqual([215, 261]);
    expect(internal.ringDimensions.assess).toEqual([291, 325]);
    expect(internal.ringDimensions.hold).toEqual([355, 385]);
  });

  it("returns positions within chart bounds and the correct ring radius", () => {
    const positioner = new Positioner(size, quadrants, rings);

    for (const ring of rings) {
      const position = positioner.getNextPosition(
        "languages-and-frameworks",
        ring.id,
      );
      const { distance } = getPolar(position, size);
      const innerRadius =
        (rings[rings.findIndex((candidate) => candidate.id === ring.id) - 1]
          ?.radius ?? 0) *
          center +
        15;
      const outerRadius = (ring.radius ?? 1) * center - 15;

      expect(position[0]).toBeGreaterThanOrEqual(0);
      expect(position[0]).toBeLessThanOrEqual(size);
      expect(position[1]).toBeGreaterThanOrEqual(0);
      expect(position[1]).toBeLessThanOrEqual(size);
      expect(distance).toBeGreaterThanOrEqual(innerRadius - 1);
      expect(distance).toBeLessThanOrEqual(outerRadius + 1);
    }
  });

  it("keeps positions within the correct quadrant angular sweep", () => {
    const positioner = new Positioner(size, quadrants, rings);
    const expectedRanges: Record<string, [number, number]> = {
      "languages-and-frameworks": [280, 350],
      "methods-and-patterns": [10, 80],
      "platforms-and-operations": [100, 170],
      tools: [190, 260],
    };

    for (const quadrant of quadrants) {
      for (let i = 0; i < 20; i++) {
        const position = positioner.getNextPosition(quadrant.id, "adopt");
        const { angle } = getPolar(position, size);
        const [start, end] = expectedRanges[quadrant.id];

        expect(angle).toBeGreaterThanOrEqual(start);
        expect(angle).toBeLessThanOrEqual(end);
      }
    }
  });

  it("does not return identical positions on repeated placement for the same quadrant and ring", () => {
    const positioner = new Positioner(size, quadrants, rings);
    const positions = Array.from({ length: 10 }, () =>
      positioner.getNextPosition("tools", "hold"),
    );
    const unique = new Set(positions.map(([x, y]) => `${x},${y}`));

    expect(unique.size).toBeGreaterThan(1);
  });
});
