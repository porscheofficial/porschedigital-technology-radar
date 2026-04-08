import styles from "./Teams.module.css";

import IconTeam from "@/components/Icons/Team";
import { cn } from "@/lib/utils";

type TeamProps = {
  team: string;
  variant?: "default" | "added" | "removed";
  size?: "default" | "small";
};

export function Team({
  team,
  variant = "default",
  size = "default",
}: TeamProps) {
  return (
    <div
      className={cn(
        styles.team,
        variant === "added" && styles.teamAdded,
        variant === "removed" && styles.teamRemoved,
        size === "small" && styles.teamSmall,
      )}
    >
      <span>{team}</span>
    </div>
  );
}

interface TeamsProps {
  teams: string[];
  addedTeams?: string[];
  removedTeams?: string[];
}

export function Teams({
  teams,
  addedTeams = [],
  removedTeams = [],
}: TeamsProps) {
  // Merge current teams + removed teams (so removed are visible with strikethrough)
  const allTeams = [
    ...teams,
    ...removedTeams.filter((t) => !teams.includes(t)),
  ].sort();

  return (
    <div className={cn(styles.teams)}>
      {allTeams.map((team) => {
        const variant = addedTeams.includes(team)
          ? "added"
          : removedTeams.includes(team)
            ? "removed"
            : "default";
        return <Team key={team} team={team} variant={variant} />;
      })}
    </div>
  );
}
