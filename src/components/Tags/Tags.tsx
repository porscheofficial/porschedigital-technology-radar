import styles from "./Tags.module.scss";

import { cn } from "@/lib/utils";
import { PTag } from "@porsche-design-system/components-react/ssr";

type TagProps = {
  tag: string;
  compact?: boolean;
};

export function Tag({ tag, compact }: TagProps) {
  return (
    <span className={cn(styles.tag)}>
      <PTag icon="bookmark" variant="info" compact={compact}>
        {tag}
      </PTag>
    </span>
  );
}
