import Link from "next/link";
import { FC, ReactNode } from "react";

import styles from "./Layout.module.scss";

import { Footer } from "@/components/Footer/Footer";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { cn } from "@/lib/utils";
import { PCrest, PLinkPure } from "@porsche-design-system/components-react/ssr";

export type LayoutClass = "default" | "full";

interface LayoutProps {
  children: ReactNode;
  layoutClass?: LayoutClass;
}

export const Layout: FC<LayoutProps> = ({
  children,
  layoutClass = "default",
}) => {
  return (
    <div id="layout" className={cn(styles.layout, styles[layoutClass])}>
      <header className={styles.header}>
        <div className={styles.headerGrid}>
          <div className={styles.headerStart}>
            <PCrest href="/" />
            <Link href="/" className={styles.brand}>
              TECH RADAR
            </Link>
          </div>

          <div className={styles.headerEnd}>
            <SearchBar />
            <PLinkPure
              href="/help-and-about-tech-radar"
              icon="information"
              hideLabel={true}
              theme="dark"
              className={styles.actionButton}
            >
              About Tech Radar
            </PLinkPure>
          </div>
        </div>
      </header>
      <main className={cn(styles.content)}>{children}</main>
      <footer className={styles.footer}>
        <Footer />
      </footer>
    </div>
  );
};
