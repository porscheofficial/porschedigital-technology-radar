import { PIcon } from "@porsche-design-system/components-react/ssr";
import Link from "next/link";

import { Chip } from "@/components/Chip/Chip";
import type { ChipKind } from "@/lib/theme/schema";
import { cn } from "@/lib/utils";
import styles from "./Teams.module.scss";

type TeamProps = {
  team: string;
  variant?: "default" | "added" | "removed";
  compact?: boolean;
  href?: string;
};

export function Team({ team, variant = "default", compact, href }: TeamProps) {
  // All three variants render the same Chip primitive — only the kind (and
  // therefore the theme-driven color) differs. The added/removed signal lives
  // entirely in `theme.json` `chips.team-added` / `chips.team-removed` so the
  // changelog diff stays themable just like the default team chip.
  const kindByVariant: Record<NonNullable<TeamProps["variant"]>, ChipKind> = {
    default: "team",
    added: "team-added",
    removed: "team-removed",
  };
  const kind = kindByVariant[variant];

  const badge = (
    <Chip
      kind={kind}
      compact={compact}
      iconSlot={<PIcon name="user-group" size="x-small" aria-hidden="true" />}
    >
      {team}
    </Chip>
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
