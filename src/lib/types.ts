export enum Flag {
  New = "new",
  Changed = "changed",
  Default = "default",
}

export type Release = string;

export interface Revision {
  release: Release;
  ring: string;
  previousRing?: string;
  body?: string;
  bodyInherited?: boolean;
  teams?: string[];
  addedTeams?: string[];
  removedTeams?: string[];
}

export interface Item {
  id: string;
  title: string;
  info?: string;
  body: string;
  featured: boolean;
  ring: string;
  quadrant: string;
  flag: Flag;
  tags?: string[];
  release: Release;
  revisions?: Revision[];
  position: [x: number, y: number];
  teams?: string[];
  addedTeams?: string[];
  removedTeams?: string[];
}

export interface Ring {
  id: string;
  title: string;
  description: string;
  color: string;
  radius?: number;
  strokeWidth?: number;
}

export interface Quadrant {
  id: string;
  title: string;
  description: string;
  color: string;
  position: number;
}

export interface ItemTrajectory {
  item: Item;
  rings: (string | null)[];
}

export interface VersionDiff {
  release: Release;
  promoted: { item: Item; from: string; to: string }[];
  demoted: { item: Item; from: string; to: string }[];
  newItems: { item: Item; ring: string }[];
  teamChanges: {
    item: Item;
    added: string[];
    removed: string[];
  }[];
}
