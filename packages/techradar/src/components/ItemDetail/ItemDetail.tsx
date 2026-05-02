import {
  PButtonPure,
  PHeading,
  PIcon,
  PInlineNotification,
  PLinkPure,
} from "@porsche-design-system/components-react/ssr";
import Link from "next/link";
import { type CSSProperties, type ReactNode, useState } from "react";

import { RingBadge } from "@/components/Badge/Badge";
import { DescriptionEdit, RingChange, RingInitial } from "@/components/Icons";
import { SafeHtml } from "@/components/SafeHtml/SafeHtml";
import { Tag } from "@/components/Tags/Tags";
import { Team, Teams } from "@/components/Teams/Teams";
import {
  getEditUrl,
  getLabel,
  getReleases,
  getRing,
  getToggle,
} from "@/lib/data";
import { formatLinkLabel, stripHtml, truncate } from "@/lib/format";
import type { Item, Revision } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./ItemDetail.module.scss";

const RECENT_RELEASE_COUNT = 3;

interface ItemProps {
  item: Item;
  segmentTitle: string;
}

export function ItemDetail({ item, segmentTitle }: ItemProps) {
  const notMaintainedText = getLabel("notUpdated");
  const hiddenFromRadarText = getLabel("hiddenFromRadar");
  const editLink = getEditUrl({ id: item.id, release: item.release });
  const hasHistory = item.revisions !== undefined && item.revisions.length > 0;
  const notMaintained = !getReleases()
    .slice(-RECENT_RELEASE_COUNT)
    .includes(item.release);

  const tagFilterEnabled = getToggle("showTagFilter");
  const teamFilterEnabled = getToggle("showTeamFilter");
  const tagHref = (tag: string) =>
    tagFilterEnabled ? `/?tags=${encodeURIComponent(tag)}` : undefined;
  const getTeamHref = (team: string) =>
    teamFilterEnabled ? `/?teams=${encodeURIComponent(team)}` : undefined;

  const ringInfo = getRing(item.ring);
  const ringColor = ringInfo?.color || "#fff";

  // Tenure
  const sortedRevisions = [...(item.revisions || [])].sort(
    (a, b) => new Date(a.release).getTime() - new Date(b.release).getTime(),
  );
  const firstAssignedRevision = sortedRevisions.find(
    (r) => r.ring === item.ring,
  );
  const tenureDate = firstAssignedRevision
    ? new Date(firstAssignedRevision.release).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  // Last Transition
  const latestRevision = [...(item.revisions || [])].sort(
    (a, b) => new Date(b.release).getTime() - new Date(a.release).getTime(),
  )[0];
  const lastTransition = latestRevision?.previousRing
    ? `${getRing(latestRevision.previousRing)?.title || latestRevision.previousRing} → ${ringInfo?.title || item.ring}`
    : null;

  return (
    <>
      {notMaintainedText && notMaintained && (
        <PInlineNotification
          description={notMaintainedText}
          state="info"
          dismissButton={false}
          className={styles.notMaintained}
        />
      )}
      {hiddenFromRadarText && !item.featured && (
        <PInlineNotification
          description={hiddenFromRadarText}
          state="info"
          dismissButton={false}
          className={styles.notMaintained}
        />
      )}
      <div
        className={styles.tintZone}
        style={{ "--ring-color": ringColor } as CSSProperties}
      >
        <div className={styles.bentoGrid}>
          <div className={cn(styles.bentoCell, styles.cellLeft)}>
            <div className={styles.ringName}>
              {ringInfo?.title || item.ring}
            </div>
            <Link href={`/${item.segment}`} className={styles.segmentLabel}>
              {segmentTitle}
              <PIcon
                name="arrow-head-right"
                size="xx-small"
                aria-hidden="true"
              />
            </Link>
            {lastTransition && (
              <div className={styles.lastTransition}>{lastTransition}</div>
            )}
            {tenureDate && (
              <div className={styles.tenure}>Since {tenureDate}</div>
            )}
          </div>
          <div className={cn(styles.bentoCell, styles.cellRight)}>
            <PHeading size="x-large" tag="h1" className={styles.title}>
              {item.title}
            </PHeading>
            <div className={styles.tags}>
              {item.tags?.map((tag) => (
                <Tag key={tag} tag={tag} href={tagHref(tag)} />
              ))}
            </div>
            {!!item.teams && item.teams.length > 0 && (
              <div className={styles.teamsContainer}>
                <Teams teams={item.teams} getTeamHref={getTeamHref} />
              </div>
            )}
          </div>
          {(item.body || (item.links && item.links.length > 0)) && (
            <div className={cn(styles.bentoCell, styles.cellDescription)}>
              {item.body && (
                <SafeHtml className={styles.description} html={item.body} />
              )}
              {!!item.links && item.links.length > 0 && (
                <div className={styles.linksSection}>
                  <div className={styles.linksSeparator}>
                    <span className={styles.linksSeparatorLabel}>Links</span>
                  </div>
                  <ul className={styles.linksList}>
                    {item.links.map((link) => (
                      <li key={link.url}>
                        <PLinkPure
                          href={link.url}
                          target="_blank"
                          icon="external"
                          alignLabel="start"
                          stretch={false}
                          underline={true}
                        >
                          {formatLinkLabel(link)}
                        </PLinkPure>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        {editLink && (
          <PLinkPure
            href={editLink}
            target="_blank"
            icon="edit"
            hideLabel={true}
            className={styles.editLink}
          >
            Edit
          </PLinkPure>
        )}
      </div>

      {hasHistory && (
        <div className={styles.timeline}>
          {item.revisions?.map((revision, index) => (
            <HistoryDateGroup
              key={revision.release}
              revision={revision}
              isFirstEntry={index === (item.revisions?.length ?? 0) - 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ExpandableDescription({ body }: { body: string }) {
  const plainText = stripHtml(body);
  const needsTruncation = plainText.length > 100;
  const [expanded, setExpanded] = useState(false);

  if (!needsTruncation) {
    return (
      <div className={styles.changeRow}>
        <DescriptionEdit className={styles.changeIconDesc} />
        <span className={styles.descriptionPreview}>{plainText}</span>
      </div>
    );
  }

  if (expanded) {
    return (
      <div className={cn(styles.changeRow, styles.changeRowExpanded)}>
        <DescriptionEdit className={styles.changeIconDesc} />
        <SafeHtml className={styles.expandedBody} html={body} />
      </div>
    );
  }

  return (
    <div className={styles.changeRow}>
      <DescriptionEdit className={styles.changeIconDesc} />
      <span className={styles.descriptionPreview}>
        {truncate(plainText, 100)}
      </span>
      <PButtonPure
        type="button"
        size="x-small"
        className={styles.moreLink}
        onClick={() => setExpanded(true)}
      >
        more
      </PButtonPure>
    </div>
  );
}

interface HistoryDateGroupProps {
  revision: Revision;
  isFirstEntry: boolean;
}

function HistoryDateGroup({ revision, isFirstEntry }: HistoryDateGroupProps) {
  const date = new Date(revision.release);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const hasRingChange = !!revision.previousRing;
  const previousRing = revision.previousRing ?? "";
  const hasBodyChange = !revision.bodyInherited && !!revision.body;
  const body = revision.body ?? "";
  const hasAddedTeams = (revision.addedTeams?.length ?? 0) > 0;
  const hasRemovedTeams = (revision.removedTeams?.length ?? 0) > 0;
  const isInitialEntry =
    isFirstEntry && !hasRingChange && !hasAddedTeams && !hasRemovedTeams;

  let ringChangeRow: ReactNode = null;
  if (hasRingChange) {
    ringChangeRow = (
      <div className={styles.changeRow}>
        <RingChange className={styles.changeIconRing} />
        <div className={styles.ringTransition}>
          <RingBadge ring={previousRing} />
          <span className={styles.ringArrow}>→</span>
          <RingBadge ring={revision.ring} />
        </div>
      </div>
    );
  } else if (isInitialEntry) {
    ringChangeRow = (
      <div className={styles.changeRow}>
        <RingInitial className={styles.changeIconRing} />
        <RingBadge ring={revision.ring} />
      </div>
    );
  }

  return (
    <div className={styles.dateGroup}>
      <div className={styles.dateLabel}>
        <span className={styles.dateLabelText}>{formattedDate}</span>
      </div>
      <div className={styles.changeList}>
        {ringChangeRow}

        {hasBodyChange && <ExpandableDescription body={body} />}

        {hasAddedTeams && (
          <div className={cn(styles.changeRow, styles.initialTeams)}>
            <div className={styles.initialTeamsList}>
              {revision.addedTeams?.map((team) => (
                <Team key={`added-${team}`} team={team} variant="added" />
              ))}
            </div>
          </div>
        )}

        {hasRemovedTeams && (
          <div className={cn(styles.changeRow, styles.initialTeams)}>
            <div className={styles.initialTeamsList}>
              {revision.removedTeams?.map((team) => (
                <Team key={`removed-${team}`} team={team} variant="removed" />
              ))}
            </div>
          </div>
        )}

        {isInitialEntry && !!revision.teams && revision.teams.length > 0 && (
          <div className={cn(styles.changeRow, styles.initialTeams)}>
            <div className={styles.initialTeamsList}>
              {revision.teams.map((team) => (
                <Team key={team} team={team} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
