import { format } from "@/lib/format";
import type {
  Item,
  ItemTrajectory,
  Quadrant,
  Revision,
  Ring,
  VersionDiff,
} from "@/lib/types";
import { assetUrl } from "@/lib/utils";
import rawData from "../../data/data.json";
import config from "./config";

const data = rawData as {
  releases: string[];
  tags: string[];
  items: Item[];
};

export function getLabel(key: keyof typeof config.labels) {
  return config.labels[key] || "";
}

export function getToggle(key: keyof typeof config.toggles) {
  return config.toggles[key] || false;
}

export function getAppName() {
  return getLabel("title");
}

export function getLogoUrl() {
  if (!config.headerLogoFile) return "";
  return assetUrl(config.headerLogoFile);
}

export function getFooterLogoUrl() {
  if (!config.footerLogoFile) return "";
  return assetUrl(config.footerLogoFile);
}

export function getJsUrl(): string {
  if (!config.jsFile) return "";
  return assetUrl(config.jsFile);
}

export function getBackgroundImage(): string {
  if (!config.backgroundImage) return "";
  return assetUrl(config.backgroundImage);
}

export function getBackgroundOpacity(): number {
  return config.backgroundOpacity ?? 0;
}

export function getChartConfig() {
  return config.chart;
}

export function getColors() {
  return config.colors;
}

export function getFlags() {
  return config.flags;
}

export function getRings(): Ring[] {
  return config.rings;
}

export function getRing(id: string): Ring | undefined {
  return getRings().find((r) => r.id === id);
}

export function getReleases(): string[] {
  return data.releases;
}

export function getSocialLinks() {
  return config.social;
}

export function getTags(): string[] {
  return data.tags;
}

export function getTeams(): string[] {
  const teamsSet = new Set<string>();
  data.items.forEach((item) => {
    if (item.teams) {
      item.teams.forEach((team) => {
        teamsSet.add(team);
      });
    }
  });
  return Array.from(teamsSet).sort();
}

export function getEditUrl(props: { id: string; release: string }) {
  if (!config.editUrl) return "";
  return format(config.editUrl, props);
}

export function getQuadrants(): Quadrant[] {
  return config.quadrants.map((q, i) => ({ ...q, position: i + 1 }));
}

export function getQuadrant(id: string): Quadrant | undefined {
  return getQuadrants().find((q) => q.id === id);
}

export function getItems(quadrant?: string, featured?: boolean): Item[] {
  return data.items.filter((item) => {
    if (quadrant && item.quadrant !== quadrant) return false;
    return !(featured && !item.featured);
  }) as Item[];
}

export function getFilteredItems(
  tag?: string,
  team?: string,
  flag?: string,
): Item[] {
  return getItems().filter(
    (item) =>
      (!tag || item.tags?.includes(tag)) &&
      (!team || item.teams?.includes(team)) &&
      (!flag || item.flag === flag),
  );
}

export function getImprintUrl() {
  return config.imprint;
}

export function getAbsoluteUrl(path: string = "/") {
  if (/^https?:\/\//.test(path)) return path;
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const baseUrl = (envBaseUrl ?? config.baseUrl ?? "").replace(/\/+$/, "");
  return `${baseUrl}${assetUrl(path)}`;
}

export function getItem(id: string): Item | undefined {
  return data.items.find((item) => item.id === id) as Item;
}

export const sortByFeaturedAndTitle = (a: Item, b: Item) =>
  Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title);

export const groupItemsByRing = (items: Item[]) => {
  return getRings().reduce(
    (acc, ring) => {
      acc[ring.id] = items.filter((item) => item.ring === ring.id);
      return acc;
    },
    {} as { [ringId: string]: Item[] },
  );
};

export const groupItemsByQuadrant = (items: Item[]) => {
  return getQuadrants().reduce(
    (acc, quadrant) => {
      const quadrantItems = items.filter(
        (item) => item.quadrant === quadrant.id,
      );
      if (quadrantItems.length) acc[quadrant.id] = quadrantItems;
      return acc;
    },
    {} as { [quadrantId: string]: Item[] },
  );
};

export function getItemTrajectories(): ItemTrajectory[] {
  const releases = getReleases();
  const items = getItems();

  return items
    .map((item) => {
      const revisions = item.revisions || [];
      const rings = releases.map((release) => {
        const rev = revisions.find((r: Revision) => r.release === release);
        if (rev) return rev.ring;
        const earlier = revisions
          .filter((r: Revision) => r.release < release)
          .sort((a: Revision, b: Revision) =>
            b.release.localeCompare(a.release),
          );
        return earlier.length > 0 ? earlier[0].ring : null;
      });
      return { item, rings };
    })
    .sort((a, b) => {
      const lastIdx = releases.length - 1;
      const prevIdx = lastIdx - 1;
      const aIsNew =
        a.rings[lastIdx] !== null && (prevIdx < 0 || a.rings[prevIdx] === null);
      const aChanged =
        aIsNew ||
        (lastIdx > 0 &&
          a.rings[lastIdx] !== null &&
          a.rings[prevIdx] !== null &&
          a.rings[lastIdx] !== a.rings[prevIdx]);
      const bIsNew =
        b.rings[lastIdx] !== null && (prevIdx < 0 || b.rings[prevIdx] === null);
      const bChanged =
        bIsNew ||
        (lastIdx > 0 &&
          b.rings[lastIdx] !== null &&
          b.rings[prevIdx] !== null &&
          b.rings[lastIdx] !== b.rings[prevIdx]);
      if (aChanged !== bChanged) return aChanged ? -1 : 1;
      return a.item.title.localeCompare(b.item.title);
    });
}

/**
 * Classify a single revision's ring transition.
 *
 * Shared primitive between `getItemChangeDirection` (per-blip arc on the radar)
 * and `getVersionDiffs` (history page promoted/demoted lists). Centralising
 * this logic guarantees the radar arc and the history table can never disagree
 * on what counts as a promotion or demotion.
 */
export function classifyRingMove(
  previousRing: string | undefined,
  ring: string,
  ringOrder: string[],
): "promoted" | "demoted" | null {
  if (!previousRing || previousRing === ring) return null;
  const fromIdx = ringOrder.indexOf(previousRing);
  const toIdx = ringOrder.indexOf(ring);
  if (fromIdx === -1 || toIdx === -1) return null;
  if (toIdx < fromIdx) return "promoted";
  if (toIdx > fromIdx) return "demoted";
  return null;
}

export function getItemChangeDirection(
  item: Item,
): "promoted" | "demoted" | null {
  const revisions = item.revisions ?? [];
  if (revisions.length === 0) return null;

  // Only the latest revision counts. `Flag.Changed` fires for any edit
  // (body/teams/ring) in the latest release, but the trajectory arc must
  // mean the same thing as the History page: the ring moved in *this*
  // release. Walking back to find an older ring move would render an arc
  // for items whose latest change was a description tweak.
  const latest = revisions[revisions.length - 1];
  return classifyRingMove(
    latest?.previousRing,
    latest?.ring ?? "",
    getRings().map((r) => r.id),
  );
}

export function getVersionDiffs(): VersionDiff[] {
  const releases = getReleases();
  const items = getItems();
  const ringOrder = getRings().map((r) => r.id);

  return releases
    .slice()
    .reverse()
    .map((release, reverseIdx) => {
      const releaseIdx = releases.length - 1 - reverseIdx;
      const diff: VersionDiff = {
        release,
        promoted: [],
        demoted: [],
        newItems: [],
        teamChanges: [],
      };

      for (const item of items) {
        const revisions = item.revisions || [];
        const rev = revisions.find((r: Revision) => r.release === release);
        if (!rev) continue;

        const isFirst =
          releaseIdx === 0 ||
          !revisions.some(
            (r: Revision) => releases.indexOf(r.release) < releaseIdx,
          );

        if (isFirst) {
          diff.newItems.push({ item, ring: rev.ring });
          continue;
        }

        const direction = classifyRingMove(
          rev.previousRing,
          rev.ring,
          ringOrder,
        );
        if (direction === "promoted" && rev.previousRing) {
          diff.promoted.push({ item, from: rev.previousRing, to: rev.ring });
        } else if (direction === "demoted" && rev.previousRing) {
          diff.demoted.push({ item, from: rev.previousRing, to: rev.ring });
        }

        const added = rev.addedTeams || [];
        const removed = rev.removedTeams || [];
        if (added.length > 0 || removed.length > 0) {
          diff.teamChanges.push({ item, added, removed });
        }
      }

      return diff;
    });
}
