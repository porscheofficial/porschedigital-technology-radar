import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import styles from "./history.module.scss";

import { Team } from "@/components/Teams/Teams";
import {
  getItemTrajectories,
  getQuadrant,
  getReleases,
  getRing,
  getVersionDiffs,
} from "@/lib/data";
import { formatTitle } from "@/lib/format";
import { CustomPage } from "@/pages/_app";
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

const MAX_VISIBLE_VERSIONS = 6;

function formatRelease(release: string) {
  const d = new Date(release + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatReleaseFull(release: string) {
  const d = new Date(release + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

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

  return (
    <>
      <Head>
        <title>{formatTitle("History")}</title>
      </Head>

      <PHeading size="large" tag="h1">
        Changelog
      </PHeading>
      <PText size="small" className={styles.subtitle}>
        Technology radar evolution across {allReleases.length} versions
      </PText>

      <section className={styles.matrixSection}>
        <div className={styles.sectionLabel}>Ring trajectory</div>
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
                      {formatRelease(r)}
                    </span>
                  </PTableHeadCell>
                ))}
              </PTableHeadRow>
            </PTableHead>
            <PTableBody>
              {trajectories.map(({ item, rings }) => {
                const ringByRelease = new Map<string, string | null>();
                allReleases.forEach((r, idx) =>
                  ringByRelease.set(r, rings[idx]),
                );

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

                const itemHref = `/${item.quadrant}/${item.id}`;

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
                          key={i}
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

      <section className={styles.changelogSection}>
        <div className={styles.sectionLabel}>Detailed changelog</div>
        {diffs.map((diff, idx) => {
          const isEmpty =
            diff.promoted.length === 0 &&
            diff.demoted.length === 0 &&
            diff.newItems.length === 0 &&
            diff.teamChanges.length === 0;

          return (
            <div key={diff.release} className={styles.release}>
              <div className={styles.releaseHeader}>
                <span className={styles.releaseDate}>
                  {formatReleaseFull(diff.release)}
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
                      href={`/${item.quadrant}/${item.id}`}
                      className={styles.changeItem}
                    >
                      <span className={styles.changeIcon}>▲</span>
                      <span className={styles.changeName}>{item.title}</span>
                      <span
                        className={styles.ringBadge}
                        style={{
                          background: `${getRing(from)?.color}33`,
                          color: getRing(from)?.color,
                        }}
                      >
                        {getRing(from)?.title}
                      </span>
                      <span className={styles.arrow}>→</span>
                      <span
                        className={styles.ringBadge}
                        style={{
                          background: `${getRing(to)?.color}33`,
                          color: getRing(to)?.color,
                        }}
                      >
                        {getRing(to)?.title}
                      </span>
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
                      href={`/${item.quadrant}/${item.id}`}
                      className={styles.changeItem}
                    >
                      <span className={styles.changeIconDown}>▼</span>
                      <span className={styles.changeName}>{item.title}</span>
                      <span
                        className={styles.ringBadge}
                        style={{
                          background: `${getRing(from)?.color}33`,
                          color: getRing(from)?.color,
                        }}
                      >
                        {getRing(from)?.title}
                      </span>
                      <span className={styles.arrow}>→</span>
                      <span
                        className={styles.ringBadge}
                        style={{
                          background: `${getRing(to)?.color}33`,
                          color: getRing(to)?.color,
                        }}
                      >
                        {getRing(to)?.title}
                      </span>
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
                      href={`/${item.quadrant}/${item.id}`}
                      className={styles.changeItem}
                    >
                      <span className={styles.changeIconNew}>✦</span>
                      <span className={styles.changeName}>{item.title}</span>
                      <span
                        className={styles.ringBadge}
                        style={{
                          background: `${getRing(ring)?.color}33`,
                          color: getRing(ring)?.color,
                        }}
                      >
                        {getRing(ring)?.title}
                      </span>
                      <span className={styles.changeDetail}>
                        {getQuadrant(item.quadrant)?.title}
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
                      href={`/${item.quadrant}/${item.id}`}
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
