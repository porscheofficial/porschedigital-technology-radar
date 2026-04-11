import { PText } from "@porsche-design-system/components-react/ssr";
import Link from "next/link";
import { type CSSProperties, useMemo } from "react";

import type { Quadrant } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./Label.module.scss";

interface LabelProps {
  quadrant: Quadrant;
}

export function Label({ quadrant }: LabelProps) {
  const style = useMemo(
    () => ({ "--quadrant-color": quadrant.color }) as CSSProperties,
    [quadrant.color],
  );

  return (
    <Link
      href={`/${quadrant.id}`}
      className={cn(styles.label, styles[`position-${quadrant.position}`])}
      style={style}
    >
      <div className={styles.header}>
        <span className={styles.title}>{quadrant.title}</span>
        <span className={styles.arrow}>→</span>
      </div>
      <PText size="x-small" className={styles.description}>
        {quadrant.description}
      </PText>
    </Link>
  );
}
