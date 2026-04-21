import { PTag } from "@porsche-design-system/components-react/ssr";
import Link from "next/link";

import { cn } from "@/lib/utils";
import styles from "./Teams.module.scss";

type TeamProps = {
  team: string;
  variant?: "default" | "added" | "removed";
  compact?: boolean;
  href?: string;
};

const variantMap = {
  default: "warning",
  added: "success",
  removed: "error",
} as const;

export function Team({ team, variant = "default", compact, href }: TeamProps) {
  const badge = (
    <PTag icon="user-group" variant={variantMap[variant]} compact={compact}>
      {team}
    </PTag>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          styles.team,
          styles.teamLink,
          variant === "removed" && styles.teamRemoved,
        )}
      >
        {badge}
      </Link>
    );
  }

  return (
    <span
      className={cn(styles.team, variant === "removed" && styles.teamRemoved)}
    >
      {badge}
    </span>
  );
}

interface TeamsProps {
  teams: string[];
  addedTeams?: string[];
  removedTeams?: string[];
  getTeamHref?: (team: string) => string | undefined;
}

export function Teams({
  teams,
  addedTeams = [],
  removedTeams = [],
  getTeamHref,
}: TeamsProps) {
  // Merge current teams + removed teams (so removed are visible with strikethrough)
  const allTeams = [
    ...teams,
    ...removedTeams.filter((t) => !teams.includes(t)),
  ].sort();

  return (
    <div className={cn(styles.teams)}>
      {allTeams.map((team) => {
        let variant: "added" | "removed" | "default" = "default";
        if (addedTeams.includes(team)) {
          variant = "added";
        } else if (removedTeams.includes(team)) {
          variant = "removed";
        }
        // Only default-variant teams get a link; added/removed are history-only.
        const href = variant === "default" ? getTeamHref?.(team) : undefined;
        return <Team key={team} team={team} variant={variant} href={href} />;
      })}
    </div>
  );
}
