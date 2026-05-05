import {
  PCrest,
  PIcon,
  PLinkPure,
} from "@porsche-design-system/components-react/ssr";
import Link from "next/link";
import type { FC, ReactNode } from "react";

import { Footer } from "@/components/Footer/Footer";
import { SpotlightSearch } from "@/components/SpotlightSearch/SpotlightSearch";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { getLabel, getReleases, getToggle } from "@/lib/data";
import { formatReleaseShort } from "@/lib/format";
import { useTheme } from "@/lib/ThemeContext";
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
  const { theme } = useTheme();
  const themeHeaderLogo = theme.assetsResolved.headerLogo;
  const logoUrl = themeHeaderLogo ? assetUrl(themeHeaderLogo) : "";
  const crestProps = { href: assetUrl("/") };

  return (
    <div id="layout" className={cn(styles.layout, styles[layoutClass])}>
      <header className={styles.header}>
        <div className={styles.blur} aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: empty static stack, index is the identity
            <div key={i} />
          ))}
        </div>
        <div className={styles.headerGrid}>
          <div className={styles.headerStart}>
            {logoUrl ? (
              <Link href="/">
                <img src={logoUrl} alt="" className={styles.customLogo} />
              </Link>
            ) : (
              <PCrest {...crestProps} />
            )}
            <Link href="/" className={styles.brand}>
              {getLabel("title")}
            </Link>
            {latestRelease && (
              <Link
                href="/changelog"
                className={styles.versionLabel}
                aria-label={`Changelog (${formatReleaseShort(latestRelease)})`}
              >
                {/* color="inherit" — default "primary" ignores parent CSS color. */}
                <PIcon
                  name="history"
                  size="x-small"
                  color="inherit"
                  aria-hidden="true"
                />
                {formatReleaseShort(latestRelease)}
              </Link>
            )}
          </div>

          <div className={styles.headerEnd}>
            {getToggle("showSearch") && <SpotlightSearch />}
            <ThemeToggle />
            {latestRelease && (
              <PLinkPure
                href={assetUrl("/changelog")}
                icon="clock"
                hideLabel={true}
                className={cn(styles.actionButton, styles.changelogLink)}
              >
                Changelog
              </PLinkPure>
            )}
            <PLinkPure
              href={assetUrl("/help-and-about-tech-radar")}
              icon="information"
              hideLabel={true}
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
