import { memo } from "react";

import { getChartConfig } from "@/lib/data";
import { Flag } from "@/lib/types";

interface BlipProps {
  color: string;
  x: number;
  y: number;
}

export const Blip = memo(function Blip({
  flag,
  color,
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
  blipSize,
  halfBlipSize,
}: InternalBlipProps & { blipSize: number }) {
  const tx = Math.round(x - halfBlipSize);
  const ty = Math.round(y - halfBlipSize);
  return (
    <rect
      transform={`rotate(-45 ${tx} ${ty})`}
      x={tx}
      y={ty}
      width={blipSize}
      height={blipSize}
      rx="3"
      stroke="none"
      fill={color}
    />
  );
}

function BlipDefault({ x, y, color, halfBlipSize }: InternalBlipProps) {
  return <circle cx={x} cy={y} r={halfBlipSize} stroke="none" fill={color} />;
}
