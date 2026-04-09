import Link, { LinkProps } from "next/link";
import { ComponentPropsWithoutRef } from "react";

import styles from "./Tags.module.scss";

import IconRemove from "@/components/Icons/Close";
import IconTag from "@/components/Icons/Tag";
import { getLabel } from "@/lib/data";
import { cn } from "@/lib/utils";
import { PHeading } from "@porsche-design-system/components-react/ssr";

type TagProps = {
  tag: string;
  isActive?: boolean;
} & Omit<LinkProps, "href"> &
  ComponentPropsWithoutRef<"a">;

export function Tag({ tag, isActive, className, ...props }: TagProps) {
  const Icon = isActive ? IconRemove : IconTag;
  return (
    <Link
      {...props}
      className={cn(styles.tag, className, isActive && styles.active)}
      href={isActive ? "/" : `/?tag=${encodeURIComponent(tag)}`}
    >
      <Icon className={cn(styles.icon)} />
      <span className={styles.label}>{tag}</span>
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
      {tags.map((tag) => (
        <Tag key={tag} tag={tag} isActive={activeTag == tag} scroll={false} />
      ))}
    </div>
  );
}
