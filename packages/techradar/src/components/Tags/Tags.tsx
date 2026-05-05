import { PIcon } from "@porsche-design-system/components-react/ssr";
import Link from "next/link";

import { Chip } from "@/components/Chip/Chip";
import { cn } from "@/lib/utils";
import styles from "./Tags.module.scss";

type TagProps = {
  tag: string;
  compact?: boolean;
  href?: string;
};

export function Tag({ tag, compact, href }: TagProps) {
  const badge = (
    <Chip
      kind="tag"
      compact={compact}
      iconSlot={<PIcon name="bookmark" size="x-small" aria-hidden="true" />}
    >
      {tag}
    </Chip>
  );

  if (href) {
    return (
      <Link href={href} className={cn(styles.tag, styles.tagLink)}>
        {badge}
      </Link>
    );
  }

  return <span className={cn(styles.tag)}>{badge}</span>;
}
