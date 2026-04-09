import Link, { LinkProps } from "next/link";
import { ComponentPropsWithoutRef } from "react";

import styles from "./TeamFilter.module.scss";

import { getLabel, getTeams } from "@/lib/data";
import { cn } from "@/lib/utils";
import { PHeading, PTag } from "@porsche-design-system/components-react/ssr";

type TeamProps = {
  team: string;
  isActive?: boolean;
} & Omit<LinkProps, "href"> &
  ComponentPropsWithoutRef<"a">;

function Team({ team, isActive, ...props }: TeamProps) {
  return (
    <Link
      {...props}
      className={cn(styles.team, isActive && styles.active)}
      href={isActive ? "/" : `/?team=${team}`}
    >
      <PTag icon={isActive ? "close" : "user-group"} variant="warning">
        {team}
      </PTag>
    </Link>
  );
}

interface TeamFilterProps {
  activeTeam?: string;
  className?: string;
}

export function TeamFilter({ activeTeam, className }: TeamFilterProps) {
  const label = getLabel("filterByTeam");
  const teams = getTeams();

  return (
    <div className={cn(styles.teams, className)}>
      {!!label && (
        <PHeading size="small" tag="h3">
          {label}
        </PHeading>
      )}
      <div className={styles.teamList}>
        {teams.map((team) => (
          <Team
            key={team}
            team={team}
            isActive={activeTeam === team}
            scroll={false}
          />
        ))}
      </div>
    </div>
  );
}
