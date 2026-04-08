import { useState } from "react";

import styles from "./ItemDetail.module.css";

import { RingBadge } from "@/components/Badge/Badge";
import {
  Attention,
  Description,
  Edit,
  RingChange,
  Team as TeamIcon,
} from "@/components/Icons";
import { Tag } from "@/components/Tags/Tags";
import { Team, Teams } from "@/components/Teams/Teams";
import { getEditUrl, getLabel, getReleases } from "@/lib/data";
import { Item, Revision } from "@/lib/types";
import { cn } from "@/lib/utils";

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
}

export function ItemDetail({ item }: ItemProps) {
  const notMaintainedText = getLabel("notUpdated");
  const editLink = getEditUrl({ id: item.id, release: item.release });
  const hasHistory = item.revisions !== undefined && item.revisions.length > 0;

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{item.title}</h1>
        {item.tags?.map((tag) => <Tag key={tag} tag={tag} />)}
      </div>

      {notMaintainedText && isNotMaintained(item.release) && (
        <div className={styles.hint}>
          <Attention className={styles.notMaintainedIcon} />
          <span>{notMaintainedText}</span>
        </div>
      )}

      <div className={styles.currentState}>
        <div className={styles.currentStateRing}>
          <RingBadge ring={item.ring} size="large" />
        </div>
        {item.body && (
          <div
            id="current-description"
            className={styles.description}
            dangerouslySetInnerHTML={{ __html: item.body }}
          />
        )}
        {editLink && (
          <a href={editLink} target="_blank" className={styles.editLink}>
            <Edit />
          </a>
        )}
        {!!item.teams && item.teams.length > 0 && <Teams teams={item.teams} />}
      </div>

      {hasHistory && (
        <>
          <h2 className={styles.historyHeading}>History</h2>
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
        <Description className={styles.changeIconDesc} />
        <span className={styles.descriptionPreview}>{plainText}</span>
      </div>
    );
  }

  if (expanded) {
    return (
      <div className={styles.descriptionFull}>
        <Description className={styles.changeIconDesc} />
        <div
          className={styles.expandedBody}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
    );
  }

  return (
    <div className={styles.changeRow}>
      <Description className={styles.changeIconDesc} />
      <span className={styles.descriptionPreview}>
        {truncate(plainText, 100)}
      </span>
      <button
        type="button"
        className={styles.moreLink}
        onClick={() => setExpanded(true)}
      >
        more
      </button>
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
            <RingBadge ring={revision.ring} />
          </div>
        ) : null}

        {hasBodyChange && <ExpandableDescription body={revision.body!} />}

        {hasAddedTeams &&
          revision.addedTeams!.map((team) => (
            <div key={`added-${team}`} className={styles.changeRow}>
              <TeamIcon className={styles.changeIconTeamAdded} />
              <span className={styles.teamPrefixAdded}>+</span>
              <Team team={team} />
            </div>
          ))}

        {hasRemovedTeams &&
          revision.removedTeams!.map((team) => (
            <div key={`removed-${team}`} className={styles.changeRow}>
              <TeamIcon className={styles.changeIconTeamRemoved} />
              <span className={styles.teamPrefixRemoved}>−</span>
              <Team team={team} />
            </div>
          ))}

        {isInitialEntry && !!revision.teams && revision.teams.length > 0 && (
          <div className={cn(styles.changeRow, styles.initialTeams)}>
            <TeamIcon className={styles.changeIcon} />
            {revision.teams.map((team) => (
              <Team key={team} team={team} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
