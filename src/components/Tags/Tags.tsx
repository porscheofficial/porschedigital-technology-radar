import Link, { LinkProps } from "next/link";
import { ComponentPropsWithoutRef } from "react";

import styles from "./Tags.module.scss";

import { getLabel } from "@/lib/data";
import { cn } from "@/lib/utils";
import { PHeading, PTag } from "@porsche-design-system/components-react/ssr";

type TagProps = {
  tag: string;
  isActive?: boolean;
  compact?: boolean;
} & Omit<LinkProps, "href"> &
  ComponentPropsWithoutRef<"a">;

export function Tag({ tag, isActive, compact, className, ...props }: TagProps) {
  return (
    <Link
      {...props}
      className={cn(styles.tag, className, isActive && styles.active)}
      href={isActive ? "/" : `/?tag=${encodeURIComponent(tag)}`}
    >
      <PTag
        icon={isActive ? "close" : "bookmark"}
        variant="info"
        compact={compact}
      >
        {tag}
      </PTag>
    </Link>
  );
}

interface TagsProps {
  tags: string[];
  activeTag?: string;
  className?: string;
}

export function Tags({ tags, activeTag, className }: TagsProps) {
  const label = getLabel("filterByTag");
  return (
    <div className={cn(styles.tags, className)}>
      {!!label && (
        <PHeading size="small" tag="h3">
          {label}
        </PHeading>
      )}
      <div className={styles.tagList}>
        {tags.map((tag) => (
          <Tag key={tag} tag={tag} isActive={activeTag == tag} scroll={false} />
        ))}
      </div>
    </div>
  );
}
