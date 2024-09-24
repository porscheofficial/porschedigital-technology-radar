import Link, { LinkProps } from "next/link";
import { ComponentPropsWithoutRef } from "react";

import styles from "./TeamFilter.module.css";

import IconRemove from "@/components/Icons/Close";
import IconTeam from "@/components/Icons/Team";
import { getLabel, getTeams } from "@/lib/data";
import { cn } from "@/lib/utils";

type TeamProps = {
  team: string;
  isActive?: boolean;
} & Omit<LinkProps, "href"> &
  ComponentPropsWithoutRef<"a">;

function Team({ team, isActive, ...props }: TeamProps) {
  const Icon = isActive ? IconRemove : IconTeam;
  return (
    <Link
      {...props}
      className={cn(styles.team, isActive && styles.active)}
      href={isActive ? "/" : `/?team=${team}`}
    >
      <Icon className={cn(styles.icon)} />
      <span className={styles.label}>{team}</span>
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
      {!!label && <h3>{label}</h3>}
      {teams.map((team) => (
        <Team
          key={team}
          team={team}
          isActive={activeTeam === team}
          scroll={false}
        />
      ))}
    </div>
  );
}
