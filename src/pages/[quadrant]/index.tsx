import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./quadrant.module.scss";

import { QuadrantRadar } from "@/components/QuadrantRadar/QuadrantRadar";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
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
import { Flag } from "@/lib/types";
import { CustomPage } from "@/pages/_app";
import {
  PHeading,
  PTag,
  PText,
} from "@porsche-design-system/components-react/ssr";

const blipSvgMap: Record<string, string> = {
  [Flag.New]:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-5 -4 24 22'%3E%3Cpath d='m.247 10.212 5.02-8.697a2 2 0 0 1 3.465 0l5.021 8.697a2 2 0 0 1-1.732 3H1.98a2 2 0 0 1-1.732-3z' fill='currentColor'/%3E%3C/svg%3E",
  [Flag.Changed]:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 24 24'%3E%3Crect width='12' height='12' x='2' y='2' rx='3' transform='rotate(-45 8 8)' fill='currentColor'/%3E%3C/svg%3E",
};

const QuadrantPage: CustomPage = () => {
  const router = useRouter();
  const { query } = router;
  const quadrant = getQuadrant(query.quadrant as string);
  const allQuadrants = useMemo(() => getQuadrants(), []);
  const rings = useMemo(() => getRings(), []);
  const { setHighlight } = useRadarHighlight();

  const items = useMemo(
    () => quadrant?.id && getItems(quadrant.id).sort(sortByFeaturedAndTitle),
    [quadrant?.id],
  );

  const ringGroups = useMemo(
    () => (items ? groupItemsByRing(items) : {}),
    [items],
  );

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
  }, [ringGroups]);

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
              items={items}
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
                      <li key={item.id} className={styles.itemRow}>
                        <div
                          role="link"
                          tabIndex={0}
                          className={styles.itemLink}
                          onMouseEnter={() => handleItemEnter(item.id)}
                          onMouseLeave={handleItemLeave}
                          onClick={() => router.push(href)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              router.push(href);
                            }
                          }}
                        >
                          <div className={styles.itemContent}>
                            <div className={styles.itemTitleRow}>
                              <Link
                                href={href}
                                className={styles.itemTitleLink}
                                tabIndex={-1}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.title}
                              </Link>
                              {item.flag !== Flag.Default && (
                                <PTag
                                  iconSource={blipSvgMap[item.flag]}
                                  color="background-frosted"
                                >
                                  {item.flag}
                                </PTag>
                              )}
                            </div>
                            {item.body && (
                              <div
                                className={styles.itemDescription}
                                dangerouslySetInnerHTML={{ __html: item.body }}
                              />
                            )}
                            {item.body && (
                              <span className={styles.readMore}>
                                read more…
                              </span>
                            )}
                          </div>
                        </div>
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

export const getStaticPaths = async () => {
  const quadrants = getQuadrants();
  const paths = quadrants.map((quadrant) => ({
    params: { quadrant: quadrant.id },
  }));

  return { paths, fallback: false };
};

export const getStaticProps = async () => {
  return { props: {} };
};
