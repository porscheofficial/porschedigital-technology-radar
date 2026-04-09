import Link from "next/link";

import styles from "./QuadrantList.module.scss";

import { RingList } from "@/components/RingList/RingList";
import { getQuadrant, groupItemsByQuadrant } from "@/lib/data";
import { Item } from "@/lib/types";
import { PHeading } from "@porsche-design-system/components-react/ssr";

interface RingListProps {
  items: Item[];
}

export function QuadrantList({ items }: RingListProps) {
  const quadrants = groupItemsByQuadrant(items);
  return (
    <ul className={styles.quadrants}>
      {Object.entries(quadrants).map(([quadrantId, items]) => {
        const quadrant = getQuadrant(quadrantId);
        if (!quadrant) return null;
        return (
          <li key={quadrantId} className={styles.quadrant}>
            <Link href={`/${quadrant.id}`} className={styles.header}>
              <PHeading size="small" tag="h3" className={styles.title}>
                {quadrant.title}
              </PHeading>
              <span className={styles.arrow}>→</span>
            </Link>
            <RingList items={items} size="small" />
          </li>
        );
      })}
    </ul>
  );
}
