import fs from "fs";
import matter from "gray-matter";
import hljs from "highlight.js";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import path from "path";

import nextConfig from "../next.config.js";
import config from "../src/lib/config";
import ErrorHandler, { ErrorType, TextColor } from "./errorHandler.js";
import Positioner from "./positioner";

import { Flag, Item } from "@/lib/types";

const {
  rings,
  chart: { size },
} = config;

const ringIds = rings.map((r) => r.id);
const quadrants = config.quadrants.map((q, i) => ({ ...q, position: i + 1 }));
const quadrantIds = quadrants.map((q) => q.id);
const tags = (config as { tags?: string[] }).tags || [];
const positioner = new Positioner(size, quadrants, rings);
const errorHandler = new ErrorHandler(quadrants, rings);

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

function dataPath(...paths: string[]): string {
  return path.resolve("data", ...paths);
}

function convertToHtml(markdown: string): string {
  // replace deprecated internal links with .html extension
  markdown = markdown.replace(/(]\(\/[^)]+)\.html/g, "$1/");

  if (nextConfig.basePath) {
    markdown = markdown.replace(/]\(\//g, `](${nextConfig.basePath}/`);
  }

  let html = marked.parse(markdown.trim()) as string;
  html = html.replace(
    /a href="http/g,
    'a target="_blank" rel="noopener noreferrer" href="http',
  );
  return html;
}

function readMarkdownFile(filePath: string) {
  const id = path.basename(filePath, ".md");
  const fileContent = fs.readFileSync(filePath, "utf8");

  try {
    const { data, content } = matter(fileContent);
    const body = convertToHtml(content);
    return { id, data, body };
  } catch (error) {
    console.error(`Failed parsing ${filePath}: ${error}`);
    process.exit(1);
  }
}

// Function to recursively read Markdown files and parse them
async function parseDirectory(dirPath: string): Promise<Item[]> {
  const items: Record<string, Item> = {};

  async function readDir(dirPath: string) {
    const entries = fs
      .readdirSync(dirPath, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await readDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const releaseDate = path.basename(path.dirname(fullPath));
        const { id, data, body } = readMarkdownFile(fullPath);

        if (!items[id]) {
          items[id] = {
            id,
            release: releaseDate,
            title: data.title || id,
            ring: data.ring,
            quadrant: data.quadrant,
            body,
            featured: data.featured !== false,
            flag: Flag.Default,
            tags: data.tags || [],
            revisions: [],
            position: [0, 0],
            teams: getOrderedTeams(data.teams) || [],
          };
        } else {
          items[id].release = releaseDate;
          items[id].body = body || items[id].body;
          items[id].title = data.title || items[id].title;
          items[id].ring = data.ring || items[id].ring;
          items[id].quadrant = data.quadrant || items[id].quadrant;
          items[id].tags = data.tags || items[id].tags;
          items[id].teams = getOrderedTeams(data.teams) || [];
          items[id].featured =
            typeof data.featured === "boolean"
              ? data.featured
              : items[id].featured;
        }

        items[id].revisions!.push({
          release: releaseDate,
          ring: data.ring,
          body,
          ...(items[id].revisions!.length > 0 &&
            (body === "" ||
              body ===
                items[id].revisions![items[id].revisions!.length - 1].body) && {
              bodyInherited: true,
            }),
          teams: getOrderedTeams(data.teams),
        });
      }
    }
  }

  await readDir(dirPath);
  return Object.values(items).sort((a, b) => a.title.localeCompare(b.title));
}

function compareArrays(arr1: any[] = [], arr2: any[] = []) {
  return (
    arr1.length === arr2.length &&
    arr1.every((element, index) => element === arr2[index])
  );
}

function getOrderedTeams(listOfTeams: Item["teams"]): Item["teams"] {
  if (!listOfTeams) return undefined;
  // We use a Set to remove potentially duplicated entries
  const teams = new Set<string>(listOfTeams);
  return Array.from(teams).sort();
}

function computeRevisionDiffs(revisions: Item["revisions"]): void {
  if (!revisions || revisions.length < 2) return;
  for (let i = 1; i < revisions.length; i++) {
    const prevTeams = revisions[i - 1].teams || [];
    const currTeams = revisions[i].teams || [];
    const added = currTeams.filter((t) => !prevTeams.includes(t));
    const removed = prevTeams.filter((t) => !currTeams.includes(t));
    if (added.length > 0) revisions[i].addedTeams = added;
    if (removed.length > 0) revisions[i].removedTeams = removed;
    // Store previous ring for "trial → adopt" display in history
    if (revisions[i].ring !== revisions[i - 1].ring) {
      revisions[i].previousRing = revisions[i - 1].ring;
    }
  }
}

function getUniqueReleases(items: Item[]): string[] {
  const releases = new Set<string>();
  for (const item of items) {
    for (const revision of item.revisions || []) {
      releases.add(revision.release);
    }
  }
  return Array.from(releases).sort();
}

function getUniqueTags(items: Item[]): string[] {
  const tags = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags || []) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}

function getFlag(item: Item, allReleases: string[]): Flag {
  // return default flag if this is the first edition of the radar
  if (allReleases.length === 1) {
    return Flag.Default;
  }

  const latestRelease = allReleases[allReleases.length - 1];
  const revisions = item.revisions || [];
  const isInLatestRelease =
    revisions.length > 0 &&
    revisions[revisions.length - 1].release === latestRelease;

  if (revisions.length == 1 && isInLatestRelease) {
    return Flag.New;
  } else if (revisions.length > 1 && isInLatestRelease) {
    return Flag.Changed;
  }

  return Flag.Default;
}

function postProcessItems(items: Item[]): {
  releases: string[];
  tags: string[];
  items: Item[];
} {
  const filteredItems = items.filter((item) => {
    // check if the items' quadrant and ring are valid
    if (!item.quadrant || !item.ring) {
      errorHandler.processBuildErrors(ErrorType.NoQuadrant, item.id);
      return false;
    }

    if (!quadrantIds.includes(item.quadrant)) {
      errorHandler.processBuildErrors(
        ErrorType.InvalidQuadrant,
        item.id,
        item.quadrant,
      );
      return false;
    }

    if (!ringIds.includes(item.ring)) {
      errorHandler.processBuildErrors(
        ErrorType.InvalidRing,
        item.id,
        item.ring,
      );
      return false;
    }

    // check if config has a key `tags` and if it is an array
    if (Array.isArray(tags) && tags.length) {
      // if tags are specified, only keep items that have at least one of the tags
      return item.tags?.some((tag) => tags.includes(tag));
    }

    return true;
  });

  errorHandler.checkForBuildErrors();

  const releases = getUniqueReleases(filteredItems);
  const uniqueTags = getUniqueTags(filteredItems);

  for (const item of filteredItems) {
    computeRevisionDiffs(item.revisions);
  }

  const processedItems = filteredItems.map((item) => {
    const lastRevision = item.revisions?.[item.revisions.length - 1];
    const processedItem = {
      ...item,
      position: positioner.getNextPosition(item.quadrant, item.ring),
      flag: getFlag(item, releases),
      ...(lastRevision?.addedTeams && { addedTeams: lastRevision.addedTeams }),
      ...(lastRevision?.removedTeams && {
        removedTeams: lastRevision.removedTeams,
      }),
      // only keep revision which ring, body or team is different
      revisions: item.revisions
        ?.filter((revision, index, revisions) => {
          // always keep the first revision as the starting point
          if (index === 0) return true;
          const { ring, body } = revision;
          const prev = revisions[index - 1];
          const teamsChanged = prev
            ? !compareArrays(revision.teams, prev.teams)
            : false;
          return (
            ring !== item.ring ||
            teamsChanged ||
            (body != "" && body != item.body && body !== prev?.body)
          );
        })
        .reverse(),
    };

    // unset revisions if there are none
    if (!processedItem.revisions?.length) {
      delete processedItem.revisions;
    }

    // unset tags if there are none
    if (!processedItem.tags?.length) {
      delete processedItem.tags;
    }

    // unset teams if there are none
    if (!processedItem.teams?.length) {
      delete processedItem.teams;
    }

    return processedItem;
  });

  return { releases, tags: uniqueTags, items: processedItems };
}

async function main() {
  // Parse the data and write radar data to JSON file
  const items = await parseDirectory(dataPath("radar"));
  const data = postProcessItems(items);

  if (data.items.length === 0) {
    errorHandler.processBuildErrors(ErrorType.NoRadarItems);
  }

  errorHandler.checkForBuildErrors(true);

  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(dataPath("data.json"), json);

  // write about data to JSON file
  const about = readMarkdownFile(dataPath("about.md"));
  fs.writeFileSync(dataPath("about.json"), JSON.stringify(about, null, 2));
  console.log(
    "ℹ️ Data written to data/data.json and data/about.json\n\n" +
      errorHandler.colorizeBackground(
        " Build was successfull ",
        TextColor.Green,
      ),
  );
}

main();
