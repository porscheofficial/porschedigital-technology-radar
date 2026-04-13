import {
  PHeading,
  PTag,
  PText,
} from "@porsche-design-system/components-react/ssr";
import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { QuadrantRadar } from "@/components/QuadrantRadar/QuadrantRadar";
import { SafeHtml } from "@/components/SafeHtml/SafeHtml";
import { blipSvgMap } from "@/lib/blipIcons";
import {
  getItems,
  getQuadrant,
  getQuadrants,
  getRing,
  getRings,
  groupItemsByRing,
  sortByFeaturedAndTitle,
} from "@/lib/data";
import { formatTitle } from "@/lib/format";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { Flag } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { CustomPage } from "@/pages/_app";
import styles from "./quadrant.module.scss";

interface QuadrantPageProps {
  quadrantId: string;
}

const QuadrantPage: CustomPage<QuadrantPageProps> = ({ quadrantId }) => {
  const quadrant = getQuadrant(quadrantId);
  const allQuadrants = getQuadrants();
  const rings = getRings();
  const { setHighlight } = useRadarHighlight();

  const items = quadrant
    ? getItems(quadrant.id).sort(sortByFeaturedAndTitle)
    : [];
  const featuredItems = items.filter((item) => item.featured);

  const ringGroups = groupItemsByRing(items);

  const [activeRings, setActiveRings] = useState<Set<string>>(new Set());
  const ringRefs = useRef<Map<string, HTMLElement>>(new Map());

  const setRingRef = useCallback(
    (ringId: string) => (el: HTMLElement | null) => {
      if (el) {
        ringRefs.current.set(ringId, el);
      } else {
        ringRefs.current.delete(ringId);
      }
    },
    [],
  );

  useEffect(() => {
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const ringId = (entry.target as HTMLElement).dataset.ring;
          if (ringId) {
            ratios.set(ringId, entry.intersectionRatio);
          }
        }

        // Pick the single ring with the highest visibility
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }

        setActiveRings(
          bestId && bestRatio > 0.05 ? new Set([bestId]) : new Set(),
        );
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    for (const [, el] of ringRefs.current.entries()) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleItemEnter = useCallback(
    (itemId: string) => {
      setHighlight([itemId], true);
    },
    [setHighlight],
  );

  const handleItemLeave = useCallback(() => {
    setHighlight([], false);
  }, [setHighlight]);

  if (!quadrant || !items) return null;

  return (
    <>
      <Head>
        <title>{formatTitle(quadrant.title)}</title>
        <meta name="description" content={quadrant.description} />
      </Head>

      <div className={styles.page}>
        <div className={styles.stickyCol}>
          <div className={styles.radarWrap}>
            <PHeading size="x-large" tag="h1">
              {quadrant.title}
            </PHeading>
            {quadrant.description && (
              <PText className={styles.description}>
                {quadrant.description}
              </PText>
            )}
            <QuadrantRadar
              quadrant={quadrant}
              allQuadrants={allQuadrants}
              rings={rings}
              items={featuredItems}
              activeRings={activeRings}
            />
          </div>
        </div>

        <div className={styles.content}>
          {rings.map((ring) => {
            const ringItems = ringGroups[ring.id] ?? [];
            const ringData = getRing(ring.id);
            const ringColor = ringData?.color ?? "var(--foreground)";
            return (
              <section
                key={ring.id}
                ref={setRingRef(ring.id)}
                className={styles.ringSection}
                data-ring={ring.id}
              >
                <div
                  className={styles.ringHeader}
                  style={
                    {
                      "--ring-color": ringColor,
                    } as React.CSSProperties
                  }
                >
                  <span className={styles.ringAccent} />
                  <div className={styles.ringTitleRow}>
                    <PHeading size="small" tag="h2">
                      {ring.title}
                    </PHeading>
                    <span className={styles.ringCount}>{ringItems.length}</span>
                  </div>
                  {ring.description && (
                    <PText size="x-small" className={styles.ringDescription}>
                      {ring.description}
                    </PText>
                  )}
                </div>

                <ul className={styles.itemList}>
                  {ringItems.map((item) => {
                    const href = `/${item.quadrant}/${item.id}`;
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          styles.itemRow,
                          !item.featured && styles.itemRowHidden,
                        )}
                      >
                        <Link
                          href={href}
                          className={styles.itemLink}
                          onMouseEnter={() => handleItemEnter(item.id)}
                          onMouseLeave={handleItemLeave}
                        >
                          <div className={styles.itemContent}>
                            <div className={styles.itemTitleRow}>
                              <span className={styles.itemTitleLink}>
                                {item.title}
                              </span>
                              {item.flag !== Flag.Default && (
                                <PTag
                                  iconSource={blipSvgMap[item.flag]}
                                  color="background-frosted"
                                >
                                  {item.flag}
                                </PTag>
                              )}
                              {!item.featured && (
                                <PTag icon="disable" color="background-frosted">
                                  Hidden
                                </PTag>
                              )}
                            </div>
                            {item.body && (
                              <SafeHtml
                                html={item.body}
                                className={styles.itemDescription}
                              />
                            )}
                            {item.body && (
                              <span className={styles.readMore}>
                                read more…
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default QuadrantPage;

export const getStaticPaths: GetStaticPaths = async () => {
  const quadrants = getQuadrants();
  const paths = quadrants.map((quadrant) => ({
    params: { quadrant: quadrant.id },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<QuadrantPageProps> = async ({
  params,
}) => {
  return { props: { quadrantId: params?.quadrant as string } };
};
