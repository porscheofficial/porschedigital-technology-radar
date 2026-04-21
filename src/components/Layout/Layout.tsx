import { PCrest, PLinkPure } from "@porsche-design-system/components-react/ssr";
import Link from "next/link";
import type { FC, ReactNode } from "react";

import { Footer } from "@/components/Footer/Footer";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { getLabel, getLogoUrl, getReleases, getToggle } from "@/lib/data";
import { formatReleaseShort } from "@/lib/format";
import { assetUrl, cn } from "@/lib/utils";
import styles from "./Layout.module.scss";

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
              <Link href={assetUrl("/")}>
                <img src={logoUrl} alt="" className={styles.customLogo} />
              </Link>
            ) : (
              <PCrest href={assetUrl("/")} />
            )}
            <Link href={assetUrl("/")} className={styles.brand}>
              {getLabel("title")}
            </Link>
            {latestRelease && (
              <Link href={assetUrl("/history")} className={styles.versionLabel}>
                {formatReleaseShort(latestRelease)}
              </Link>
            )}
          </div>

          <div className={styles.headerEnd}>
            {getToggle("showSearch") && <SearchBar />}
            {latestRelease && (
              <PLinkPure
                href={assetUrl("/history")}
                icon="clock"
                hideLabel={true}
                theme="dark"
                className={cn(styles.actionButton, styles.historyLink)}
              >
                History
              </PLinkPure>
            )}
            <PLinkPure
              href={assetUrl("/help-and-about-tech-radar")}
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
