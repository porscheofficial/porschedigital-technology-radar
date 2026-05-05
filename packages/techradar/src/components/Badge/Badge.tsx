import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  useMemo,
} from "react";
import { getRing, getRings } from "@/lib/data";
import { formatRelease } from "@/lib/format";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";
import styles from "./Badge.module.scss";

interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  children?: ReactNode;
  color?: string;
  selectable?: boolean;
  selected?: boolean;
  size?: "small" | "medium" | "large";
}

export function Badge({
  children,
  color,
  size = "medium",
  selectable,
  selected,
  ...props
}: BadgeProps) {
  const style = useMemo(
    () => (color ? ({ "--badge": color } as CSSProperties) : undefined),
    [color],
  );

  const Component = props.onClick ? "button" : "span";

  return (
    <Component
      {...props}
      style={style}
      className={cn(
        props.className,
        styles.badge,
        styles[`size-${size}`],
        color && styles.colored,
        selectable && styles.selectable,
        selected && styles.selected,
      )}
    >
      {children}
    </Component>
  );
}

interface RingBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  ring: string;
  release?: string;
}

export function RingBadge({
  ring: ringName,
  release,
  ...props
}: RingBadgeProps) {
  const ring = getRing(ringName);
  const { theme } = useTheme();
  const ringIdx = getRings().findIndex((r) => r.id === ringName);
  const ringColor = ringIdx >= 0 ? theme.radar.rings[ringIdx] : undefined;
  if (!ring) return null;

  const label = release
    ? `${ring.title} | ${formatRelease(release)}`
    : ring.title;

  return (
    <Badge color={ringColor} {...props}>
      {label}
    </Badge>
  );
}
