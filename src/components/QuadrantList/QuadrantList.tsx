import Link from "next/link";

import styles from "./QuadrantList.module.scss";

import { QuadrantLink } from "@/components/QuadrantLink/QuadrantLink";
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
            <div className={styles.header}>
              <PHeading size="small" tag="h3" className={styles.title}>
                <Link href={`/${quadrant.id}`}>{quadrant.title}</Link>
              </PHeading>
              <QuadrantLink quadrant={quadrant} />
            </div>
            <RingList items={items} size="small" />
          </li>
        );
      })}
    </ul>
  );
}
