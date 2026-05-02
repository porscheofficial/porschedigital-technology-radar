import { render } from "@testing-library/react";

import { getChartConfig } from "@/lib/data";
import { Flag } from "@/lib/types";

import { Blip } from "../Blip";

vi.mock("@/lib/data", () => ({
  getChartConfig: vi.fn(() => ({ size: 800, blipSize: 12 })),
}));

const mockGetChartConfig = vi.mocked(getChartConfig);

describe("Blip", () => {
  beforeEach(() => {
    mockGetChartConfig.mockClear();
    mockGetChartConfig.mockReturnValue({ size: 800, blipSize: 12 });
  });

  it("renders a new blip as a translated path", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <Blip flag={Flag.New} color="#ff6600" x={100} y={200} />
      </svg>,
    );

    const path = container.querySelector("path");

    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute("fill", "#ff6600");
    expect(path).toHaveAttribute("transform", "translate(94,194)");
    expect(mockGetChartConfig).toHaveBeenCalledTimes(1);
  });

  it("renders a changed blip as a rotated rect", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <Blip flag={Flag.Changed} color="#00aa88" x={100} y={200} />
      </svg>,
    );

    const rect = container.querySelector("rect");

    expect(rect).toBeInTheDocument();
    expect(rect).toHaveAttribute("fill", "#00aa88");
    expect(rect).toHaveAttribute("width", "12");
    expect(rect).toHaveAttribute("height", "12");
    expect(rect).toHaveAttribute("rx", "3");
    expect(rect).toHaveAttribute("x", "94");
    expect(rect).toHaveAttribute("y", "194");
    expect(rect).toHaveAttribute("transform", "rotate(-45 100 200)");
    expect(mockGetChartConfig).toHaveBeenCalledTimes(1);
  });

  it("does not render a change arc when direction is undefined", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <Blip flag={Flag.Changed} color="#00aa88" x={100} y={200} />
      </svg>,
    );

    expect(container.querySelector("g path")).not.toBeInTheDocument();
    expect(container.querySelector("g rect")).toBeInTheDocument();
  });

  it("renders a promoted change arc", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <Blip
          flag={Flag.Changed}
          color="#00aa88"
          direction="promoted"
          centerX={100}
          centerY={100}
          x={100}
          y={200}
        />
      </svg>,
    );

    const arc = container.querySelector("g path");

    expect(arc).toBeInTheDocument();
    expect(arc).toHaveAttribute(
      "d",
      expect.stringContaining("A 10.5 10.5 0 0 1"),
    );
  });

  it("renders a demoted change arc", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <Blip
          flag={Flag.Changed}
          color="#00aa88"
          direction="demoted"
          centerX={100}
          centerY={100}
          x={100}
          y={200}
        />
      </svg>,
    );

    const arc = container.querySelector("g path");

    expect(arc).toBeInTheDocument();
    expect(arc).toHaveAttribute(
      "d",
      expect.stringContaining("A 10.5 10.5 0 0 1"),
    );
  });

  it("uses the blip color for the change arc stroke", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <Blip
          flag={Flag.Changed}
          color="#123abc"
          direction="promoted"
          centerX={100}
          centerY={100}
          x={100}
          y={200}
        />
      </svg>,
    );

    expect(container.querySelector("g path")).toHaveAttribute(
      "stroke",
      "#123abc",
    );
  });

  it("renders the change arc before the diamond", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <Blip
          flag={Flag.Changed}
          color="#00aa88"
          direction="promoted"
          centerX={100}
          centerY={100}
          x={100}
          y={200}
        />
      </svg>,
    );

    const group = container.querySelector("g");

    expect(group?.children[0]?.tagName).toBe("path");
    expect(group?.children[1]?.tagName).toBe("rect");
  });

  it("renders a default blip as a circle", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <Blip flag={Flag.Default} color="#3366ff" x={100} y={200} />
      </svg>,
    );

    const circle = container.querySelector("circle");

    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute("cx", "100");
    expect(circle).toHaveAttribute("cy", "200");
    expect(circle).toHaveAttribute("r", "6");
    expect(circle).toHaveAttribute("fill", "#3366ff");
    expect(mockGetChartConfig).toHaveBeenCalledTimes(1);
  });
});
