import { PIcon, PTag } from "@porsche-design-system/components-react/ssr";
import { blipSvgMap } from "@/lib/blipIcons";
import { getFlags, getTags, getTeams, getToggle } from "@/lib/data";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { cn } from "@/lib/utils";
import styles from "./RadarFilters.module.scss";

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
    <section className={styles.filters} aria-label="Filter radar">
      <div className={styles.row}>
        <span className={styles.rowLabel}>
          <PIcon name="filter" size="x-small" aria-hidden="true" />
          Status
        </span>
        <div className={styles.pills}>
          {Object.entries(flags).map(([key, flag]) => {
            const isActive = activeFlag === key;
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
    </section>
  );
}
