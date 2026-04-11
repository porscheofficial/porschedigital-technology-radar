import { PTag } from "@porsche-design-system/components-react/ssr";

import { cn } from "@/lib/utils";
import styles from "./Teams.module.scss";

type TeamProps = {
  team: string;
  variant?: "default" | "added" | "removed";
  compact?: boolean;
};

const variantMap = {
  default: "warning",
  added: "success",
  removed: "error",
} as const;

export function Team({ team, variant = "default", compact }: TeamProps) {
  return (
    <span
      className={cn(styles.team, variant === "removed" && styles.teamRemoved)}
    >
      <PTag icon="user-group" variant={variantMap[variant]} compact={compact}>
        {team}
      </PTag>
    </span>
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
