import { describeFilledArc, polarToCartesian } from "@/lib/radarGeometry";

describe("polarToCartesian", () => {
  it("places 0° at the top of the circle", () => {
    const p = polarToCartesian(100, 100, 50, 0);
    expect(p.x).toBe(100);
    expect(p.y).toBe(50);
  });

  it("places 90° on the right side", () => {
    const p = polarToCartesian(100, 100, 50, 90);
    expect(p.x).toBe(150);
    expect(p.y).toBe(100);
  });

  it("places 180° at the bottom", () => {
    const p = polarToCartesian(100, 100, 50, 180);
    expect(p.x).toBe(100);
    expect(p.y).toBe(150);
  });

  it("places 270° on the left", () => {
    const p = polarToCartesian(100, 100, 50, 270);
    expect(p.x).toBe(50);
    expect(p.y).toBe(100);
  });
});

describe("describeFilledArc", () => {
  it("returns a path that starts with M and closes with Z", () => {
    const d = describeFilledArc(100, 100, 30, 60, 270, 360);
    expect(d).toMatch(/^M /);
    expect(d).toMatch(/ Z$/);
    expect(d).toContain("A 60 60");
    expect(d).toContain("A 30 30");
  });

  it("uses largeArcFlag=1 when sweep exceeds 180°", () => {
    const d = describeFilledArc(0, 0, 10, 20, 0, 270);
    // The largeArcFlag is the 4th value in each "A" segment.
    // With sweep=270 (>180), both arcs must use flag 1.
    const arcs = d.match(/A (\S+) (\S+) (\S+) (\S+)/g) ?? [];
    expect(arcs).toHaveLength(2);
    for (const arc of arcs) {
      const tokens = arc.split(" ");
      expect(tokens[4]).toBe("1");
    }
  });

  it("uses largeArcFlag=0 when sweep is at or below 180°", () => {
    const d = describeFilledArc(0, 0, 10, 20, 0, 90);
    const arcs = d.match(/A (\S+) (\S+) (\S+) (\S+)/g) ?? [];
    expect(arcs).toHaveLength(2);
    for (const arc of arcs) {
      const tokens = arc.split(" ");
      expect(tokens[4]).toBe("0");
    }
  });

  it("uses sweep_flag=0 on the outer arc and sweep_flag=1 on the inner arc", () => {
    // SVG's Y-down coordinate system inverts mathematical sweep direction:
    // sweep_flag=0 traces visually clockwise. The outer arc must trace the
    // wedge's leading edge in the SAME visual direction as the radar's
    // 0°→90°→180°→270° (top→right→bottom→left) convention, which is CW.
    // The inner arc must trace BACK in the opposite direction to close.
    const d = describeFilledArc(0, 0, 10, 20, 0, 90);
    const arcMatches = [
      ...d.matchAll(/A (\S+) (\S+) (\S+) (\S+) (\S+) (\S+) (\S+)/g),
    ];
    expect(arcMatches).toHaveLength(2);
    expect(arcMatches[0]?.[5]).toBe("0");
    expect(arcMatches[1]?.[5]).toBe("1");
  });

  it("places the outer arc endpoints at the angles defined by polarToCartesian", () => {
    // Pin the convention: a wedge from startAngle=90° (right) to
    // endAngle=180° (bottom) at outerRadius=100 must START at the
    // bottom point (0, 100) and END at the right point (100, 0),
    // because the M command is `polarToCartesian(0, 0, 100, endAngle)`
    // and the outer-arc target is `polarToCartesian(0, 0, 100, startAngle)`.
    // If this flips, the wedge will visually cover the wrong quadrant
    // (the bug found by manual browser QA on 2026-04-28).
    const d = describeFilledArc(0, 0, 50, 100, 90, 180);
    const tokens = d.split(" ");
    expect(tokens[0]).toBe("M");
    expect(tokens[1]).toBe("0");
    expect(tokens[2]).toBe("100");
    const outerEndXIdx = tokens.indexOf("A") + 6;
    expect(tokens[outerEndXIdx]).toBe("100");
    expect(tokens[outerEndXIdx + 1]).toBe("0");
  });
});
