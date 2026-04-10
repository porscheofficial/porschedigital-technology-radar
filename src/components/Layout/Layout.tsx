import Link from "next/link";
import { FC, ReactNode } from "react";

import styles from "./Layout.module.scss";

import { Footer } from "@/components/Footer/Footer";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { getLabel, getLogoUrl, getReleases, getToggle } from "@/lib/data";
import { cn } from "@/lib/utils";
import { PCrest, PLinkPure } from "@porsche-design-system/components-react/ssr";

function formatRelease(release: string) {
  const d = new Date(release + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export type LayoutClass = "default" | "full";

interface LayoutProps {
  children: ReactNode;
  layoutClass?: LayoutClass;
}

export const Layout: FC<LayoutProps> = ({
  children,
  layoutClass = "default",
}) => {
  const releases = getReleases();
  const latestRelease = releases[releases.length - 1];
  const logoUrl = getLogoUrl();

  return (
    <div id="layout" className={cn(styles.layout, styles[layoutClass])}>
      <header className={styles.header}>
        <div className={styles.headerGrid}>
          <div className={styles.headerStart}>
            {logoUrl ? (
              <Link href="/">
                <img src={logoUrl} alt="" className={styles.customLogo} />
              </Link>
            ) : (
              <PCrest href="/" />
            )}
            <Link href="/" className={styles.brand}>
              {getLabel("title")}
            </Link>
            {latestRelease && (
              <Link href="/history" className={styles.versionLabel}>
                {formatRelease(latestRelease)}
              </Link>
            )}
          </div>

          <div className={styles.headerEnd}>
            {getToggle("showSearch") && <SearchBar />}
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
