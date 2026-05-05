import type { ReactNode } from "react";

import type { ChipKind } from "@/lib/theme/schema";
import { cn } from "@/lib/utils";
import styles from "./Chip.module.scss";

type ChipProps = {
  kind: ChipKind;
  iconSlot?: ReactNode;
  compact?: boolean;
  children: ReactNode;
  className?: string;
};

export function Chip({
  kind,
  iconSlot,
  compact,
  children,
  className,
}: ChipProps) {
  return (
    <span
      data-chip-kind={kind}
      className={cn(styles.chip, compact && styles.compact, className)}
    >
      {iconSlot && (
        <span className={styles.icon} aria-hidden="true">
          {iconSlot}
        </span>
      )}
      <span className={styles.label}>{children}</span>
    </span>
  );
}
