import { PIcon, PTag } from "@porsche-design-system/components-react/ssr";
import { blipSvgMap } from "@/lib/blipIcons";
import { getFlags, getTags, getTeams, getToggle } from "@/lib/data";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { cn } from "@/lib/utils";
import styles from "./RadarFilters.module.scss";

export function RadarFilters() {
  const {
    activeFlags,
    activeTags,
    activeTeams,
    filterActive,
    toggleFlag,
    toggleTag,
    toggleTeam,
    clearFilters,
  } = useRadarHighlight();

  const flags = getFlags();
  const tags = getTags();
  const teams = getTeams();

  const showTags = getToggle("showTagFilter") && tags.length > 0;
  const showTeams = getToggle("showTeamFilter") && teams.length > 0;
  const isMultiSelect = getToggle("multiSelectFilters");

  return (
    <section className={styles.filters} aria-label="Filter radar">
      <div className={styles.row}>
        <span className={styles.rowLabel}>
          <PIcon name="filter" size="x-small" aria-hidden="true" />
          Status
        </span>
        <div className={styles.pills}>
          {Object.entries(flags).map(([key, flag]) => {
            const isActive = activeFlags.has(key);
            const title = flag.title;
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

      {showTags && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            <PIcon name="filter" size="x-small" aria-hidden="true" />
            Tags
          </span>
          <div className={styles.pills}>
            {tags.map((tag) => {
              const isActive = activeTags.has(tag);
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

      {showTeams && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>
            <PIcon name="filter" size="x-small" aria-hidden="true" />
            Teams
          </span>
          <div className={styles.pills}>
            {teams.map((team) => {
              const isActive = activeTeams.has(team);
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

      {isMultiSelect && (
        <div
          className={cn(
            styles.clearRow,
            !filterActive && styles.clearRowHidden,
          )}
        >
          <button
            type="button"
            onClick={clearFilters}
            className={styles.clearButton}
            tabIndex={filterActive ? 0 : -1}
            aria-hidden={!filterActive}
          >
            <PTag icon="close" color="background-frosted">
              clear all filters
            </PTag>
          </button>
        </div>
      )}
    </section>
  );
}
