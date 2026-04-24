import {
  PHeading,
  PIcon,
  PTable,
  PTableBody,
  PTableCell,
  PTableHead,
  PTableHeadCell,
  PTableHeadRow,
  PTableRow,
  PText,
} from "@porsche-design-system/components-react/ssr";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { RingBadge } from "@/components/Badge/Badge";
import { SeoHead } from "@/components/SeoHead/SeoHead";
import { Team } from "@/components/Teams/Teams";
import {
  getItemTrajectories,
  getReleases,
  getRing,
  getSegment,
  getVersionDiffs,
} from "@/lib/data";
import { formatRelease, formatReleaseCompact } from "@/lib/format";
import type { CustomPage } from "@/pages/_app";
import styles from "./history.module.scss";

const MAX_VISIBLE_VERSIONS = 6;

const History: CustomPage = () => {
  const allReleases = getReleases();
  const trajectories = getItemTrajectories();
  const diffs = getVersionDiffs();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const needsTruncation = allReleases.length > MAX_VISIBLE_VERSIONS;
  const visibleReleases =
    needsTruncation && !showAll
      ? allReleases.slice(-MAX_VISIBLE_VERSIONS)
      : allReleases;

  const displayReleases = [...visibleReleases].reverse();

  const canCompare = focusIndex < displayReleases.length - 1;
  const description = `Technology radar evolution across ${allReleases.length} versions.`;

  return (
    <>
      <SeoHead title="History" description={description} path="/history/" />

      <PHeading size="large" tag="h1">
        Changelog
      </PHeading>
      <PText size="small" className={styles.subtitle}>
        Technology radar evolution across {allReleases.length} versions
      </PText>

      <nav className={styles.toc} aria-label="Page sections">
        <a href="#ring-trajectory" className={styles.tocLink}>
          Ring trajectory
        </a>
        <span className={styles.tocDivider} aria-hidden="true" />
        <a href="#detailed-changelog" className={styles.tocLink}>
          Detailed changelog
        </a>
        {diffs.map((diff) => (
          <a
            key={diff.release}
            href={`#release-${diff.release}`}
            className={styles.tocReleaseLink}
          >
            {formatReleaseCompact(diff.release)}
          </a>
        ))}
      </nav>

      <section id="ring-trajectory" className={styles.matrixSection}>
        <div className={styles.sectionLabel}>Ring trajectory</div>
        <PText size="x-small" className={styles.sectionDescription}>
          Each row represents a technology and each column a radar release. The
          coloured dots show which ring the technology was placed in at that
          point in time. Click a column header to shift the comparison focus —
          rows that changed between the focused release and its predecessor are
          highlighted in full opacity while stable items are dimmed. A{" "}
          <span className={styles.descriptionStar}>✦</span> marks the release
          where a technology first appeared on the radar.
        </PText>
        <div className={styles.matrixScroll}>
          <PTable compact caption="Ring trajectory across releases">
            <PTableHead>
              <PTableHeadRow>
                <PTableHeadCell className={styles.matrixNameCol}>
                  <span className={styles.nameColLabel}>Technology</span>
                </PTableHeadCell>
                {displayReleases.map((r, i) => (
                  <PTableHeadCell
                    key={r}
                    className={`${styles.matrixRelease} ${i === focusIndex ? styles.matrixReleaseFocused : ""}`}
                    onClick={() => setFocusIndex(i)}
                  >
                    <span className={styles.releaseLabel}>
                      {formatReleaseCompact(r)}
                    </span>
                  </PTableHeadCell>
                ))}
              </PTableHeadRow>
            </PTableHead>
            <PTableBody>
              {trajectories.map(({ item, rings }) => {
                const ringByRelease = new Map<string, string | null>();
                allReleases.forEach((r, idx) => {
                  ringByRelease.set(r, rings[idx]);
                });

                const displayRings = displayReleases.map(
                  (r) => ringByRelease.get(r) ?? null,
                );

                const focusRing = displayRings[focusIndex];
                const compareRing = canCompare
                  ? displayRings[focusIndex + 1]
                  : null;
                const isNew = focusRing !== null && compareRing === null;
                const hasChange =
                  isNew ||
                  (focusRing !== null &&
                    compareRing !== null &&
                    focusRing !== compareRing);

                const firstAppearanceIdx = rings.findIndex((r) => r !== null);
                const firstAppearanceRelease =
                  firstAppearanceIdx >= 0
                    ? allReleases[firstAppearanceIdx]
                    : null;

                const itemHref = `/${item.segment}/${item.id}`;

                return (
                  <PTableRow
                    key={item.id}
                    className={`${hasChange ? styles.rowChanged : styles.rowStable} ${styles.clickableRow}`}
                    onClick={() => router.push(itemHref)}
                  >
                    <PTableCell className={styles.matrixName}>
                      <Link
                        href={itemHref}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.title}
                      </Link>
                    </PTableCell>
                    {displayRings.map((ring, i) => {
                      const ringData = ring ? getRing(ring) : null;
                      const currentRelease = displayReleases[i];
                      const dotIsNew =
                        ring !== null &&
                        firstAppearanceRelease === currentRelease;
                      const isFuture = i < focusIndex;
                      return (
                        <PTableCell
                          key={currentRelease}
                          className={`${styles.matrixCell} ${isFuture ? styles.futureCell : ""}`}
                        >
                          {ring ? (
                            <span
                              className={styles.dot}
                              style={{ background: ringData?.color }}
                              title={ringData?.title}
                            >
                              {dotIsNew && (
                                <span className={styles.dotNew}>✦</span>
                              )}
                            </span>
                          ) : (
                            <span className={styles.dotEmpty} />
                          )}
                        </PTableCell>
                      );
                    })}
                  </PTableRow>
                );
              })}
            </PTableBody>
          </PTable>
        </div>

        <div className={styles.matrixFooter}>
          <div className={styles.matrixLegend}>
            {["adopt", "trial", "assess", "hold"].map((ringId) => {
              const ring = getRing(ringId);
              if (!ring) return null;
              return (
                <span key={ringId} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ background: ring.color }}
                  />
                  {ring.title}
                </span>
              );
            })}
            <span className={styles.legendItem}>
              <span className={styles.legendDotEmpty} />
              Not tracked
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendStarIcon}>✦</span>
              First appearance
            </span>
          </div>

          {needsTruncation && (
            <button
              type="button"
              className={styles.showAllButton}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? `Show last ${MAX_VISIBLE_VERSIONS} versions`
                : `Show all ${allReleases.length} versions`}
            </button>
          )}
        </div>
      </section>

      <section id="detailed-changelog" className={styles.changelogSection}>
        <div className={styles.sectionLabel}>Detailed changelog</div>
        {diffs.map((diff, idx) => {
          const isEmpty =
            diff.promoted.length === 0 &&
            diff.demoted.length === 0 &&
            diff.newItems.length === 0 &&
            diff.teamChanges.length === 0;

          return (
            <div
              key={diff.release}
              id={`release-${diff.release}`}
              className={styles.release}
            >
              <div className={styles.releaseHeader}>
                <span className={styles.releaseDate}>
                  {formatRelease(diff.release)}
                </span>
                {idx === 0 && (
                  <span className={styles.latestBadge}>Latest</span>
                )}
              </div>

              {isEmpty && (
                <PText size="x-small" className={styles.emptyRelease}>
                  Initial radar version —{" "}
                  {diffs.length > 1
                    ? "baseline for all items"
                    : "no prior version to compare"}
                </PText>
              )}

              {diff.promoted.length > 0 && (
                <div className={styles.changeGroup}>
                  <div className={styles.changeGroupTitle}>▲ Promoted</div>
                  {diff.promoted.map(({ item, from, to }) => (
                    <Link
                      key={item.id}
                      href={`/${item.segment}/${item.id}`}
                      className={styles.changeItem}
                    >
                      <span className={styles.changeIcon}>▲</span>
                      <span className={styles.changeName}>{item.title}</span>
                      <RingBadge ring={from} size="small" />
                      <span className={styles.arrow}>→</span>
                      <RingBadge ring={to} size="small" />
                    </Link>
                  ))}
                </div>
              )}

              {diff.demoted.length > 0 && (
                <div className={styles.changeGroup}>
                  <div className={styles.changeGroupTitle}>▼ Demoted</div>
                  {diff.demoted.map(({ item, from, to }) => (
                    <Link
                      key={item.id}
                      href={`/${item.segment}/${item.id}`}
                      className={styles.changeItem}
                    >
                      <span className={styles.changeIconDown}>▼</span>
                      <span className={styles.changeName}>{item.title}</span>
                      <RingBadge ring={from} size="small" />
                      <span className={styles.arrow}>→</span>
                      <RingBadge ring={to} size="small" />
                    </Link>
                  ))}
                </div>
              )}

              {diff.newItems.length > 0 && (
                <div className={styles.changeGroup}>
                  <div className={styles.changeGroupTitle}>✦ New</div>
                  {diff.newItems.map(({ item, ring }) => (
                    <Link
                      key={item.id}
                      href={`/${item.segment}/${item.id}`}
                      className={styles.changeItem}
                    >
                      <span className={styles.changeIconNew}>✦</span>
                      <span className={styles.changeName}>{item.title}</span>
                      <RingBadge ring={ring} size="small" />
                      <span className={styles.changeDetail}>
                        {getSegment(item.segment)?.title}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {diff.teamChanges.length > 0 && (
                <div className={styles.changeGroup}>
                  <div className={styles.changeGroupTitle}>
                    <PIcon
                      name="user-group"
                      size="x-small"
                      aria-hidden="true"
                    />{" "}
                    Team changes
                  </div>
                  {diff.teamChanges.map(({ item, added, removed }) => (
                    <Link
                      key={item.id}
                      href={`/${item.segment}/${item.id}`}
                      className={styles.changeItem}
                    >
                      <span className={styles.changeIcon}>
                        <PIcon
                          name="user-group"
                          size="x-small"
                          aria-hidden="true"
                        />
                      </span>
                      <span className={styles.changeName}>{item.title}</span>
                      <span className={styles.teamChanges}>
                        {added.map((t) => (
                          <Team key={t} team={t} variant="added" compact />
                        ))}
                        {removed.map((t) => (
                          <Team key={t} team={t} variant="removed" compact />
                        ))}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
};

export default History;
