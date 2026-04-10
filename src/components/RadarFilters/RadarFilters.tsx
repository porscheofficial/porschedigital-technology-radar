import styles from "./RadarFilters.module.scss";

import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { getFlags, getTags, getTeams, getToggle } from "@/lib/data";
import { Flag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PIcon, PTag } from "@porsche-design-system/components-react/ssr";

export function RadarFilters() {
  const {
    activeFlag,
    activeTag,
    activeTeam,
    toggleFlag,
    toggleTag,
    toggleTeam,
  } = useRadarHighlight();

  const flags = getFlags();
  const tags = getTags();
  const teams = getTeams();

  return (
    <div className={styles.filters} role="region" aria-label="Filter radar">
      <div className={styles.row}>
        <span className={styles.rowLabel}>
          <PIcon name="filter" size="x-small" aria-hidden="true" />
          Status
        </span>
        <div className={styles.pills}>
          {Object.entries(flags).map(([key, flag]) => {
            const isActive = activeFlag === key;
            const title = flag.title;
            const blipSvgMap: Record<string, string> = {
              [Flag.New]:
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-5 -4 24 22'%3E%3Cpath d='m.247 10.212 5.02-8.697a2 2 0 0 1 3.465 0l5.021 8.697a2 2 0 0 1-1.732 3H1.98a2 2 0 0 1-1.732-3z' fill='currentColor'/%3E%3C/svg%3E",
              [Flag.Changed]:
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 24 24'%3E%3Crect width='12' height='12' x='2' y='2' rx='3' transform='rotate(-45 8 8)' fill='currentColor'/%3E%3C/svg%3E",
              [Flag.Default]:
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 24 24'%3E%3Ccircle cx='8' cy='8' r='6' fill='currentColor'/%3E%3C/svg%3E",
            };
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFlag(key)}
                className={cn(styles.pill, isActive && styles.active)}
              >
                {isActive ? (
                  <PTag
                    key={`${key}-active`}
                    icon="close"
                    color="background-frosted"
                  >
                    {title.toLowerCase()}
                  </PTag>
                ) : (
                  <PTag
                    key={`${key}-idle`}
                    iconSource={blipSvgMap[key]}
                    color="background-frosted"
                  >
                    {title.toLowerCase()}
                  </PTag>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {getToggle("showTagFilter") && tags.length > 0 && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            <PIcon name="filter" size="x-small" aria-hidden="true" />
            Tags
          </span>
          <div className={styles.pills}>
            {tags.map((tag) => {
              const isActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(styles.pill, isActive && styles.active)}
                >
                  <PTag icon={isActive ? "close" : "bookmark"} variant="info">
                    {tag}
                  </PTag>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {getToggle("showTeamFilter") && teams.length > 0 && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            <PIcon name="filter" size="x-small" aria-hidden="true" />
            Teams
          </span>
          <div className={styles.pills}>
            {teams.map((team) => {
              const isActive = activeTeam === team;
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => toggleTeam(team)}
                  className={cn(styles.pill, isActive && styles.active)}
                >
                  <PTag
                    icon={isActive ? "close" : "user-group"}
                    variant="warning"
                  >
                    {team}
                  </PTag>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
