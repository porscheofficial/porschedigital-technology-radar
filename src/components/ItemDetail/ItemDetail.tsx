import { CSSProperties, useState } from "react";

import styles from "./ItemDetail.module.scss";

import { RingBadge } from "@/components/Badge/Badge";
import {
  Attention,
  DescriptionEdit,
  RingChange,
  RingInitial,
  TeamAdd,
  Team as TeamIcon,
  TeamRemove,
} from "@/components/Icons";
import { Tag } from "@/components/Tags/Tags";
import { Team, Teams } from "@/components/Teams/Teams";
import { getEditUrl, getLabel, getReleases, getRing } from "@/lib/data";
import { Item, Revision } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  PButtonPure,
  PHeading,
  PLinkPure,
} from "@porsche-design-system/components-react/ssr";

const latestReleases = getReleases().slice(-3);

function isNotMaintained(release: string) {
  return !latestReleases.includes(release);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

interface ItemProps {
  item: Item;
  quadrantTitle: string;
}

export function ItemDetail({ item, quadrantTitle }: ItemProps) {
  const notMaintainedText = getLabel("notUpdated");
  const editLink = getEditUrl({ id: item.id, release: item.release });
  const hasHistory = item.revisions !== undefined && item.revisions.length > 0;

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
      <div
        className={styles.tintZone}
        style={{ "--ring-color": ringColor } as CSSProperties}
      >
        <div className={styles.bentoGrid}>
          {notMaintainedText && isNotMaintained(item.release) && (
            <div className={cn(styles.bentoCell, styles.cellHint)}>
              <Attention className={styles.notMaintainedIcon} />
              <span>{notMaintainedText}</span>
            </div>
          )}
          <div className={cn(styles.bentoCell, styles.cellLeft)}>
            <div className={styles.ringName}>
              {ringInfo?.title || item.ring}
            </div>
            <div className={styles.quadrantLabel}>{quadrantTitle}</div>
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
              {item.tags?.map((tag) => <Tag key={tag} tag={tag} />)}
            </div>
            {!!item.teams && item.teams.length > 0 && (
              <div className={styles.teamsContainer}>
                <Teams teams={item.teams} />
              </div>
            )}
          </div>
          {item.body && (
            <div className={cn(styles.bentoCell, styles.cellDescription)}>
              <div
                id="current-description"
                className={styles.description}
                dangerouslySetInnerHTML={{ __html: item.body }}
              />
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
        <>
          <div className={styles.timeline}>
            {item.revisions!.map((revision, index) => (
              <HistoryDateGroup key={index} id={item.id} revision={revision} />
            ))}
          </div>
        </>
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
        <div
          className={styles.expandedBody}
          dangerouslySetInnerHTML={{ __html: body }}
        />
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
  id: string;
  revision: Revision;
}

function HistoryDateGroup({ id, revision }: HistoryDateGroupProps) {
  const date = new Date(revision.release);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const hasRingChange = !!revision.previousRing;
  const hasBodyChange = !revision.bodyInherited && !!revision.body;
  const hasAddedTeams = (revision.addedTeams?.length ?? 0) > 0;
  const hasRemovedTeams = (revision.removedTeams?.length ?? 0) > 0;
  const isInitialEntry = !hasRingChange && !hasAddedTeams && !hasRemovedTeams;

  return (
    <div className={styles.dateGroup}>
      <div className={styles.dateLabel}>
        <span className={styles.dateLabelText}>{formattedDate}</span>
      </div>
      <div className={styles.changeList}>
        {hasRingChange ? (
          <div className={styles.changeRow}>
            <RingChange className={styles.changeIconRing} />
            <div className={styles.ringTransition}>
              <RingBadge ring={revision.previousRing!} />
              <span className={styles.ringArrow}>→</span>
              <RingBadge ring={revision.ring} />
            </div>
          </div>
        ) : isInitialEntry ? (
          <div className={styles.changeRow}>
            <RingInitial className={styles.changeIconRing} />
            <RingBadge ring={revision.ring} />
          </div>
        ) : null}

        {hasBodyChange && <ExpandableDescription body={revision.body!} />}

        {hasAddedTeams &&
          revision.addedTeams!.map((team) => (
            <div key={`added-${team}`} className={styles.changeRow}>
              <TeamAdd className={styles.changeIconTeamAdded} />
              <Team team={team} />
            </div>
          ))}

        {hasRemovedTeams &&
          revision.removedTeams!.map((team) => (
            <div key={`removed-${team}`} className={styles.changeRow}>
              <TeamRemove className={styles.changeIconTeamRemoved} />
              <Team team={team} />
            </div>
          ))}

        {isInitialEntry && !!revision.teams && revision.teams.length > 0 && (
          <div className={cn(styles.changeRow, styles.initialTeams)}>
            <TeamIcon className={styles.changeIcon} />
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
