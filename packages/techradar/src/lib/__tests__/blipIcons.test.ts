import { blipSvgMap } from "@/lib/blipIcons";
import { Flag } from "@/lib/types";

describe("blipSvgMap", () => {
  it("has an entry for every Flag value", () => {
    for (const flag of Object.values(Flag)) {
      expect(blipSvgMap).toHaveProperty(flag);
    }
  });

  it("has exactly 3 entries matching the Flag enum size", () => {
    expect(Object.keys(blipSvgMap)).toHaveLength(Object.values(Flag).length);
  });

  it.each(Object.values(Flag))("Flag.%s has a valid SVG data URI", (flag) => {
    const value = blipSvgMap[flag];
    expect(value).toBeTruthy();
    expect(value).toMatch(/^data:image\/svg\+xml,/);
  });

  it.each(
    Object.values(Flag),
  )("Flag.%s SVG contains a shape element", (flag) => {
    const svg = decodeURIComponent(blipSvgMap[flag]);
    expect(svg).toMatch(/<(path|rect|circle)\s/);
  });

  it("New flag uses a path (triangle)", () => {
    const svg = decodeURIComponent(blipSvgMap[Flag.New]);
    expect(svg).toContain("<path");
  });

  it("Changed flag uses a rect (diamond)", () => {
    const svg = decodeURIComponent(blipSvgMap[Flag.Changed]);
    expect(svg).toContain("<rect");
  });

  it("Default flag uses a circle", () => {
    const svg = decodeURIComponent(blipSvgMap[Flag.Default]);
    expect(svg).toContain("<circle");
  });
});
