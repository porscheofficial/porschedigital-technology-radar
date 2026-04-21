import { PTag } from "@porsche-design-system/components-react/ssr";
import Link from "next/link";

import { cn } from "@/lib/utils";
import styles from "./Tags.module.scss";

type TagProps = {
  tag: string;
  compact?: boolean;
  href?: string;
};

export function Tag({ tag, compact, href }: TagProps) {
  const badge = (
    <PTag icon="bookmark" variant="info" compact={compact}>
      {tag}
    </PTag>
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
