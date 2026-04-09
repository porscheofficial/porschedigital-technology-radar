import Link from "next/link";

import styles from "./ItemList.module.scss";

import { FlagBadge, RingBadge } from "@/components/Badge/Badge";
import { getQuadrant } from "@/lib/data";
import { Item } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PText } from "@porsche-design-system/components-react/ssr";

export interface ItemListProps {
  items: Item[];
  activeId?: string;
  size?: "small" | "default" | "large";
  hideRing?: boolean;
  className?: string;
}

export function ItemList({
  items,
  activeId,
  size = "default",
  hideRing = false,
  className,
}: ItemListProps) {
  return (
    <ul
      className={cn(styles.list, className, {
        [styles.isSmall]: size === "small",
        [styles.isLarge]: size === "large",
      })}
    >
      {items.map((item) => (
        <li className={styles.item} key={item.id}>
          <Link
            className={cn(styles.link, {
              [styles.isFadedOut]: !item.featured,
              [styles.isActive]: item.id === activeId,
            })}
            href={`/${item.quadrant}/${item.id}`}
          >
            <PText tag="span" className={styles.title}>
              {item.title}
            </PText>
            <FlagBadge
              className={styles.flag}
              flag={item.flag}
              short={size == "small"}
            />

            {size === "large" && (
              <div className={styles.info}>
                <PText tag="span" size="x-small" className={styles.quadrant}>
                  {getQuadrant(item.quadrant)?.title}
                </PText>
                {!hideRing && (
                  <RingBadge
                    className={styles.ring}
                    ring={item.ring}
                    size="small"
                  />
                )}
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
