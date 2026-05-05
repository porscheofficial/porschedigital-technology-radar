import type { Item, Revision } from "@/lib/types";
import { Flag } from "@/lib/types";

const _mockItems: Item[] = [
  {
    id: "typescript",
    title: "TypeScript",
    body: "<p>TypeScript is great</p>",
    featured: true,
    ring: "adopt",
    segment: "languages-and-frameworks",
    flag: Flag.Default,
    tags: ["language"],
    release: "2024-03",
    position: [0.3, 0.2],
    teams: ["platform", "frontend"],
    revisions: [
      { release: "2024-03", ring: "adopt" },
      { release: "2024-01", ring: "trial", previousRing: undefined },
    ] as Revision[],
  },
  {
    id: "react",
    title: "React",
    body: "<p>React is a UI library</p>",
    featured: false,
    ring: "trial",
    segment: "languages-and-frameworks",
    flag: Flag.New,
    tags: ["frontend"],
    release: "2024-03",
    position: [0.5, 0.6],
    teams: ["frontend"],
    revisions: [{ release: "2024-03", ring: "trial" }] as Revision[],
  },
  {
    id: "kubernetes",
    title: "Kubernetes",
    body: "<p>K8s</p>",
    featured: false,
    ring: "assess",
    segment: "platforms-and-operations",
    flag: Flag.Changed,
    tags: ["infrastructure"],
    release: "2024-01",
    position: [0.7, 0.8],
    teams: ["platform"],
    revisions: [
      {
        release: "2024-03",
        ring: "assess",
        previousRing: "hold",
        addedTeams: ["devops"],
        removedTeams: [],
      },
      { release: "2024-01", ring: "hold" },
    ] as Revision[],
  },
];

vi.mock("../../../data/data.json", () => ({
  default: {
    releases: ["2024-01", "2024-03"],
    tags: ["language", "frontend", "infrastructure"],
    items: [
      {
        id: "typescript",
        title: "TypeScript",
        body: "<p>TypeScript is great</p>",
        featured: true,
        ring: "adopt",
        segment: "languages-and-frameworks",
        flag: "default",
        tags: ["language"],
        release: "2024-03",
        position: [0.3, 0.2],
        teams: ["platform", "frontend"],
        revisions: [
          { release: "2024-03", ring: "adopt" },
          { release: "2024-01", ring: "trial" },
        ],
      },
      {
        id: "react",
        title: "React",
        body: "<p>React is a UI library</p>",
        featured: false,
        ring: "trial",
        segment: "languages-and-frameworks",
        flag: "new",
        tags: ["frontend"],
        release: "2024-03",
        position: [0.5, 0.6],
        teams: ["frontend"],
        revisions: [{ release: "2024-03", ring: "trial" }],
      },
      {
        id: "kubernetes",
        title: "Kubernetes",
        body: "<p>K8s</p>",
        featured: false,
        ring: "assess",
        segment: "platforms-and-operations",
        flag: "changed",
        tags: ["infrastructure"],
        release: "2024-01",
        position: [0.7, 0.8],
        teams: ["platform"],
        revisions: [
          {
            release: "2024-03",
            ring: "assess",
            previousRing: "hold",
            addedTeams: ["devops"],
            removedTeams: [],
          },
          { release: "2024-01", ring: "hold" },
        ],
      },
    ],
  },
}));

vi.mock("../config", () => {
  const config = {
    basePath: "/",
    baseUrl: "https://radar.example.com",
    editUrl: "https://github.com/edit/{release}/{id}.md",
    jsFile: "",
    toggles: {
      showSearch: true,
      showChart: true,
      showTagFilter: true,
      showTeamFilter: true,
      showBlipChange: true,
    },
    colors: {
      foreground: "#FFF",
      background: "#000",
    },
    segments: [
      {
        id: "languages-and-frameworks",
        title: "Languages & Frameworks",
        description: "Programming languages and frameworks",
        color: "#4A9E7E",
      },
      {
        id: "platforms-and-operations",
        title: "Platforms & Operations",
        description: "Infrastructure and ops",
        color: "#C4A85E",
      },
    ],
    rings: [
      {
        id: "adopt",
        title: "Adopt",
        description: "",
        color: "#4A9E7E",
        radius: 0.5,
        strokeWidth: 5,
      },
      {
        id: "trial",
        title: "Trial",
        description: "",
        color: "#5B8DB8",
        radius: 0.69,
        strokeWidth: 3,
      },
      {
        id: "assess",
        title: "Assess",
        description: "",
        color: "#C4A85E",
        radius: 0.85,
        strokeWidth: 2,
      },
      {
        id: "hold",
        title: "Hold",
        description: "",
        color: "#B85B5B",
        radius: 1,
        strokeWidth: 0.75,
      },
    ],
    flags: {
      new: { title: "New" },
      changed: { title: "Changed" },
      default: { title: "Unchanged" },
    },
    chart: { size: 800, blipSize: 12 },
    social: [{ href: "https://github.com/test", icon: "github" }],
    imprint: "https://example.com/imprint",
    labels: {
      title: "Test Radar",
      imprint: "Legal",
      footer: "Footer text",
      notUpdated: "Not updated",
      searchPlaceholder: "Search...",
      metaDescription: "",
    },
  };
  return { default: config };
});

import {
  getAbsoluteUrl,
  getAppName,
  getChartConfig,
  getEditUrl,
  getFilteredItems,
  getFlags,
  getImprintUrl,
  getItem,
  getItemChangeDirection,
  getItems,
  getItemTrajectories,
  getJsUrl,
  getLabel,
  getReleases,
  getRing,
  getRings,
  getSegment,
  getSegments,
  getSocialLinks,
  getTags,
  getTeams,
  getToggle,
  getVersionDiffs,
  groupItemsByRing,
  groupItemsBySegment,
  sortByFeaturedAndTitle,
} from "@/lib/data";

describe("getLabel", () => {
  it("returns label by key", () => {
    expect(getLabel("title")).toBe("Test Radar");
  });

  it("returns empty string for missing key", () => {
    expect(getLabel("metaDescription")).toBe("");
  });
});

describe("getToggle", () => {
  it("returns toggle value", () => {
    expect(getToggle("showSearch")).toBe(true);
  });
});

describe("getAppName", () => {
  it("returns app title", () => {
    expect(getAppName()).toBe("Test Radar");
  });
});

describe("getJsUrl", () => {
  it("returns empty string when JS file not configured", () => {
    expect(getJsUrl()).toBe("");
  });
});

describe("getChartConfig / getFlags", () => {
  it("returns chart config", () => {
    expect(getChartConfig()).toEqual({ size: 800, blipSize: 12 });
  });

  it("returns flags", () => {
    expect(getFlags()).toHaveProperty("new");
  });
});

describe("getRings", () => {
  it("returns all rings", () => {
    const rings = getRings();
    expect(rings).toHaveLength(4);
    expect(rings[0].id).toBe("adopt");
  });
});

describe("getRing", () => {
  it("finds ring by id", () => {
    expect(getRing("trial")?.title).toBe("Trial");
  });

  it("returns undefined for unknown id", () => {
    expect(getRing("nonexistent")).toBeUndefined();
  });
});

describe("getReleases", () => {
  it("returns releases array", () => {
    expect(getReleases()).toEqual(["2024-01", "2024-03"]);
  });
});

describe("getSocialLinks", () => {
  it("returns social links", () => {
    expect(getSocialLinks()).toHaveLength(1);
  });
});

describe("getTags", () => {
  it("returns tags array", () => {
    expect(getTags()).toEqual(["language", "frontend", "infrastructure"]);
  });
});

describe("getTeams", () => {
  it("returns sorted unique teams", () => {
    const teams = getTeams();
    expect(teams).toEqual(["frontend", "platform"]);
  });
});

describe("getEditUrl", () => {
  it("formats edit URL with props", () => {
    expect(getEditUrl({ id: "react", release: "2024-03" })).toBe(
      "https://github.com/edit/2024-03/react.md",
    );
  });
});

describe("getSegments", () => {
  it("returns segments with position", () => {
    const quads = getSegments();
    expect(quads).toHaveLength(2);
    expect(quads[0].position).toBe(1);
    expect(quads[1].position).toBe(2);
  });
});

describe("getSegment", () => {
  it("finds segment by id", () => {
    expect(getSegment("languages-and-frameworks")?.title).toBe(
      "Languages & Frameworks",
    );
  });
});

describe("getItems", () => {
  it("returns all items", () => {
    expect(getItems()).toHaveLength(3);
  });

  it("filters by segment", () => {
    const items = getItems("languages-and-frameworks");
    expect(items).toHaveLength(2);
  });

  it("filters by featured", () => {
    const items = getItems(undefined, true);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("typescript");
  });

  it("returns all items when featured is false/undefined", () => {
    expect(getItems(undefined, false)).toHaveLength(3);
    expect(getItems(undefined, undefined)).toHaveLength(3);
    expect(getItems()).toHaveLength(3);
  });

  it("combines segment + featured filters", () => {
    const items = getItems("languages-and-frameworks", true);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("typescript");
  });

  it("returns empty when segment has no featured items", () => {
    const items = getItems("platforms-and-operations", true);
    expect(items).toHaveLength(0);
  });
});

describe("getFilteredItems", () => {
  it("filters by tag", () => {
    const items = getFilteredItems("frontend");
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("react");
  });

  it("filters by team", () => {
    const items = getFilteredItems(undefined, "platform");
    expect(items).toHaveLength(2);
  });

  it("filters by flag", () => {
    const items = getFilteredItems(undefined, undefined, "new");
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("react");
  });
});

describe("getImprintUrl / getAbsoluteUrl", () => {
  it("returns imprint URL", () => {
    expect(getImprintUrl()).toBe("https://example.com/imprint");
  });

  it("returns absolute URL with path", () => {
    expect(getAbsoluteUrl("/about")).toBe("https://radar.example.com/about");
  });

  it("preserves an already-absolute URL untouched", () => {
    expect(getAbsoluteUrl("https://cdn.example.com/x.png")).toBe(
      "https://cdn.example.com/x.png",
    );
  });

  it("strips trailing slashes from baseUrl", () => {
    expect(getAbsoluteUrl("/about")).not.toContain(".com//");
  });

  it("prefers NEXT_PUBLIC_BASE_URL over config.baseUrl when set", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://env.example.com");
    expect(getAbsoluteUrl("/about")).toBe("https://env.example.com/about");
    vi.unstubAllEnvs();
  });

  it("returns just the path when both env and config baseUrl are empty", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "");
    expect(getAbsoluteUrl("/about")).toBe("/about");
    vi.unstubAllEnvs();
  });
});

describe("getItem", () => {
  it("finds item by id", () => {
    expect(getItem("typescript")?.title).toBe("TypeScript");
  });

  it("returns undefined for unknown id", () => {
    expect(getItem("nonexistent")).toBeUndefined();
  });
});

describe("sortByFeaturedAndTitle", () => {
  it("sorts featured items first, then by title", () => {
    const items = getItems();
    const sorted = [...items].sort(sortByFeaturedAndTitle);
    expect(sorted[0].id).toBe("typescript");
    expect(sorted[1].id).toBe("kubernetes");
    expect(sorted[2].id).toBe("react");
  });

  it("non-featured items sort alphabetically by title", () => {
    const items = getItems();
    const nonFeatured = [...items]
      .filter((i) => !i.featured)
      .sort(sortByFeaturedAndTitle);
    expect(nonFeatured[0].title < nonFeatured[1].title).toBe(true);
  });
});

describe("groupItemsByRing", () => {
  it("groups items by ring id", () => {
    const groups = groupItemsByRing(getItems());
    expect(groups.adopt).toHaveLength(1);
    expect(groups.trial).toHaveLength(1);
    expect(groups.assess).toHaveLength(1);
    expect(groups.hold).toHaveLength(0);
  });
});

describe("groupItemsBySegment", () => {
  it("groups items by segment id", () => {
    const groups = groupItemsBySegment(getItems());
    expect(groups["languages-and-frameworks"]).toHaveLength(2);
    expect(groups["platforms-and-operations"]).toHaveLength(1);
  });
});

describe("getItemTrajectories", () => {
  it("returns trajectories for all items", () => {
    const trajectories = getItemTrajectories();
    expect(trajectories).toHaveLength(3);
  });

  it("maps rings per release", () => {
    const trajectories = getItemTrajectories();
    const ts = trajectories.find((t) => t.item.id === "typescript");
    expect(ts?.rings).toEqual(["trial", "adopt"]);
  });

  it("fills missing releases with earlier ring", () => {
    const trajectories = getItemTrajectories();
    const k8s = trajectories.find((t) => t.item.id === "kubernetes");
    expect(k8s?.rings).toEqual(["hold", "assess"]);
  });

  it("returns null for releases before first revision", () => {
    const trajectories = getItemTrajectories();
    const react = trajectories.find((t) => t.item.id === "react");
    expect(react?.rings).toEqual([null, "trial"]);
  });
});

describe("getVersionDiffs", () => {
  it("returns diffs per release in reverse order", () => {
    const diffs = getVersionDiffs();
    expect(diffs).toHaveLength(2);
    expect(diffs[0].release).toBe("2024-03");
    expect(diffs[1].release).toBe("2024-01");
  });

  it("identifies new items", () => {
    const diffs = getVersionDiffs();
    const march = diffs[0];
    expect(march.newItems.some((n) => n.item.id === "react")).toBe(true);
  });

  it("identifies promoted items", () => {
    const diffs = getVersionDiffs();
    const march = diffs[0];
    expect(march.promoted.some((p) => p.item.id === "kubernetes")).toBe(true);
  });

  it("identifies team changes", () => {
    const diffs = getVersionDiffs();
    const march = diffs[0];
    expect(march.teamChanges.some((t) => t.item.id === "kubernetes")).toBe(
      true,
    );
  });
});

describe("getItemChangeDirection", () => {
  it("returns promoted when the latest revision moves inward", () => {
    const item: Item = {
      ..._mockItems[2],
      revisions: [
        {
          release: "2024-03",
          ring: "assess",
          previousRing: "hold",
        },
        { release: "2024-01", ring: "hold" },
      ],
    };

    expect(getItemChangeDirection(item)).toBe("promoted");
  });

  it("returns demoted when the latest revision moves outward", () => {
    const item: Item = {
      ..._mockItems[0],
      ring: "hold",
      revisions: [
        {
          release: "2024-03",
          ring: "hold",
          previousRing: "trial",
        },
        { release: "2024-01", ring: "trial" },
      ],
    };

    expect(getItemChangeDirection(item)).toBe("demoted");
  });

  it("returns null when there are no revisions", () => {
    const item: Item = { ..._mockItems[0], revisions: [] };

    expect(getItemChangeDirection(item)).toBeNull();
  });

  it("returns null when no revision has a previous ring", () => {
    expect(getItemChangeDirection(_mockItems[0])).toBeNull();
  });

  it("returns null when the latest revision is a non-ring update, even if an older revision moved rings", () => {
    const item: Item = {
      ..._mockItems[2],
      ring: "assess",
      revisions: [
        { release: "2024-06", ring: "assess" },
        {
          release: "2024-03",
          ring: "assess",
          previousRing: "hold",
        },
        { release: "2024-01", ring: "hold" },
      ],
    };

    expect(getItemChangeDirection(item)).toBeNull();
  });

  it("returns null when the latest revision stays in the same ring", () => {
    const item: Item = {
      ..._mockItems[0],
      revisions: [
        {
          release: "2024-03",
          ring: "adopt",
          previousRing: "adopt",
        },
        { release: "2024-01", ring: "trial" },
      ],
    };

    expect(getItemChangeDirection(item)).toBeNull();
  });

  it("returns null when the latest revision references an unknown ring", () => {
    const item: Item = {
      ..._mockItems[0],
      revisions: [
        {
          release: "2024-03",
          ring: "adopt",
          previousRing: "unknown-ring",
        },
        { release: "2024-01", ring: "trial" },
      ],
    };

    expect(getItemChangeDirection(item)).toBeNull();
  });
});

describe("revision ordering invariant", () => {
  it("data.json stores each item's revisions newest-first", () => {
    const items = getItems();
    const violations: string[] = [];
    for (const item of items) {
      const releases = (item.revisions ?? []).map((r) => r.release);
      if (releases.length < 2) continue;
      const sorted = [...releases].sort().reverse();
      if (JSON.stringify(releases) !== JSON.stringify(sorted)) {
        violations.push(`${item.id}: ${releases.join(",")}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("radar arc ↔ changelog page consistency", () => {
  it("getItemChangeDirection agrees with getVersionDiffs for the latest release", () => {
    const items = getItems();
    const diffs = getVersionDiffs();
    if (diffs.length === 0) return;
    const latest = diffs[0];
    const promotedIds = new Set(latest.promoted.map((p) => p.item.id));
    const demotedIds = new Set(latest.demoted.map((d) => d.item.id));

    const disagreements: string[] = [];
    for (const item of items) {
      const dir = getItemChangeDirection(item);
      const inLatest =
        item.revisions?.[0]?.release === latest.release &&
        (item.revisions?.length ?? 0) > 1;
      if (!inLatest) continue;
      const expected = promotedIds.has(item.id)
        ? "promoted"
        : demotedIds.has(item.id)
          ? "demoted"
          : null;
      if (dir !== expected) {
        disagreements.push(`${item.id}: arc=${dir}, changelog=${expected}`);
      }
    }
    expect(disagreements).toEqual([]);
  });
});
