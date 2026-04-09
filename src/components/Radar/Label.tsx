import Link from "next/link";
import { CSSProperties, useMemo } from "react";

import styles from "./Label.module.scss";

import { QuadrantLink } from "@/components/QuadrantLink/QuadrantLink";
import { getLabel } from "@/lib/data";
import { Quadrant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PHeading, PText } from "@porsche-design-system/components-react/ssr";

interface LabelProps {
  quadrant: Quadrant;
}

export function Label({ quadrant }: LabelProps) {
  const style = useMemo(
    () => ({ "--quadrant-color": quadrant.color }) as CSSProperties,
    [quadrant.color],
  );

  return (
    <div
      className={cn(styles.label, styles[`position-${quadrant.position}`])}
      style={style}
    >
      <div className={styles.header}>
        <span>
          {getLabel("quadrant")} {quadrant.position}
        </span>
        <QuadrantLink quadrant={quadrant} />
      </div>
      <PHeading size="small" tag="h3" className={styles.title}>
        {quadrant.title}
      </PHeading>
      <PText size="x-small" className={styles.description}>
        {quadrant.description}
      </PText>
    </div>
  );
}
