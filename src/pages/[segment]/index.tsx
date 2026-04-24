import {
  PHeading,
  PTag,
  PText,
} from "@porsche-design-system/components-react/ssr";
import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { SegmentRadar } from "@/components/SegmentRadar/SegmentRadar";
import { SeoHead } from "@/components/SeoHead/SeoHead";
import { blipSvgMap } from "@/lib/blipIcons";
import {
  getItems,
  getRing,
  getRings,
  getSegment,
  getSegments,
  groupItemsByRing,
  sortByFeaturedAndTitle,
} from "@/lib/data";
import { stripHtml } from "@/lib/format";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { Flag } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { CustomPage } from "@/pages/_app";
import styles from "./segment.module.scss";

interface SegmentPageProps {
  segmentId: string;
}

const SegmentPage: CustomPage<SegmentPageProps> = ({ segmentId }) => {
  const segment = getSegment(segmentId);
  const allSegments = getSegments();
  const rings = getRings();
  const { setHighlight } = useRadarHighlight();

  const items = segment
    ? getItems(segment.id).sort(sortByFeaturedAndTitle)
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

  if (!segment || !items) return null;

  return (
    <>
      <SeoHead
        title={segment.title}
        description={segment.description}
        path={`/${segment.id}/`}
      />

      <div className={styles.page}>
        <div className={styles.mobileHeader}>
          <PHeading size="large" tag="h1">
            {segment.title}
          </PHeading>
          {segment.description && (
            <PText className={styles.description}>{segment.description}</PText>
          )}
        </div>

        <div className={styles.stickyCol}>
          <div className={styles.radarWrap}>
            <PHeading size="x-large" tag="h1">
              {segment.title}
            </PHeading>
            {segment.description && (
              <PText className={styles.description}>
                {segment.description}
              </PText>
            )}
            <SegmentRadar
              segment={segment}
              allSegments={allSegments}
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
                    const href = `/${item.segment}/${item.id}`;
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
                          <span className={styles.itemContent}>
                            <span className={styles.itemTitleRow}>
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
                            </span>
                            {item.body && (
                              <span className={styles.itemDescription}>
                                {stripHtml(item.body)}
                              </span>
                            )}
                            {item.body && (
                              <span className={styles.readMore}>
                                read more…
                              </span>
                            )}
                          </span>
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

export default SegmentPage;

export const getStaticPaths: GetStaticPaths = async () => {
  const segments = getSegments();
  const paths = segments.map((segment) => ({
    params: { segment: segment.id },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<SegmentPageProps> = async ({
  params,
}) => {
  return { props: { segmentId: params?.segment as string } };
};
