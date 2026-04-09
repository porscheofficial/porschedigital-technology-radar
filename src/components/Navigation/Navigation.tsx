import Link from "next/link";

import styles from "./Navigation.module.scss";

import { getLabel } from "@/lib/data";
import { PIcon } from "@porsche-design-system/components-react/ssr";

export function Navigation() {
  return (
    <nav className={styles.nav}>
      <ul className={styles.list}>
        <li className={styles.item}>
          <Link href="/help-and-about-tech-radar">
            <PIcon name="information" className={styles.icon} size="small" />
            <span className={styles.label}>{getLabel("pageAbout")}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
