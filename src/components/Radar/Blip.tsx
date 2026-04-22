import { memo } from "react";

import { getChartConfig } from "@/lib/data";
import { Flag } from "@/lib/types";

interface BlipProps {
  color: string;
  direction?: "promoted" | "demoted";
  centerX?: number;
  centerY?: number;
  x: number;
  y: number;
}

export const Blip = memo(function Blip({
  flag,
  color,
  direction,
  centerX,
  centerY,
  x,
  y,
}: BlipProps & { flag: Flag }) {
  const { blipSize } = getChartConfig();
  const halfBlipSize = blipSize / 2;

  switch (flag) {
    case Flag.New:
      return <BlipNew x={x} y={y} color={color} halfBlipSize={halfBlipSize} />;
    case Flag.Changed:
      return (
        <BlipChanged
          x={x}
          y={y}
          color={color}
          direction={direction}
          centerX={centerX}
          centerY={centerY}
          blipSize={blipSize}
          halfBlipSize={halfBlipSize}
        />
      );
    default:
      return (
        <BlipDefault x={x} y={y} color={color} halfBlipSize={halfBlipSize} />
      );
  }
});

interface InternalBlipProps extends BlipProps {
  halfBlipSize: number;
}

function BlipNew({ x, y, color, halfBlipSize }: InternalBlipProps) {
  const tx = Math.round(x - halfBlipSize);
  const ty = Math.round(y - halfBlipSize);
  return (
    <path
      stroke="none"
      fill={color}
      d="M5.7679491924311 2.1387840678323a2 2 0 0 1 3.4641016151378 0l5.0358983848622 8.7224318643355a2 2 0 0 1 -1.7320508075689 3l-10.071796769724 0a2 2 0 0 1 -1.7320508075689 -3"
      transform={`translate(${tx},${ty})`}
    />
  );
}

function BlipChanged({
  x,
  y,
  color,
  direction,
  centerX,
  centerY,
  blipSize,
  halfBlipSize,
}: InternalBlipProps & {
  blipSize: number;
  direction?: "promoted" | "demoted";
  centerX?: number;
  centerY?: number;
}) {
  const tx = Math.round(x - halfBlipSize);
  const ty = Math.round(y - halfBlipSize);

  let arcPath: string | null = null;
  if (direction && centerX !== undefined && centerY !== undefined) {
    const theta = Math.atan2(y - centerY, x - centerX);
    const centerAngle = direction === "demoted" ? theta : theta + Math.PI;
    const halfSweep = (55 * Math.PI) / 180;
    const startAngle = centerAngle - halfSweep;
    const endAngle = centerAngle + halfSweep;
    const radius = blipSize * 0.875;
    const startX = x + radius * Math.cos(startAngle);
    const startY = y + radius * Math.sin(startAngle);
    const endX = x + radius * Math.cos(endAngle);
    const endY = y + radius * Math.sin(endAngle);

    arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
  }

  return (
    <g>
      {arcPath ? (
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : null}
      <rect
        transform={`rotate(-45 ${x} ${y})`}
        x={tx}
        y={ty}
        width={blipSize}
        height={blipSize}
        rx="3"
        stroke="none"
        fill={color}
      />
    </g>
  );
}

function BlipDefault({ x, y, color, halfBlipSize }: InternalBlipProps) {
  return <circle cx={x} cy={y} r={halfBlipSize} stroke="none" fill={color} />;
}
