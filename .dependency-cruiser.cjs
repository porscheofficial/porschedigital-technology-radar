// Architecture rules enforced via dependency-cruiser.
// Each rule's `comment` cites the steering doc agents should consult.
// See AGENTS.md (root) for the full invariant catalog.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ───── Data layer ──────────────────────────────────────────────
    {
      name: "data-accessor-only",
      comment:
        "data/data.json is the build artifact. Only src/lib/data.ts may import it. " +
        "Components consume the typed accessors. (src/lib/AGENTS.md)",
      severity: "error",
      from: { pathNot: "(^src/lib/data\\.ts$|__tests__|\\.test\\.)" },
      to: { path: "^data/data\\.json$" },
    },

    // ───── Static-export bans ──────────────────────────────────────
    // NB: `to.path` matches the *resolved* path (e.g. node_modules/...),
    // not the bare specifier from `import`. All external-module ban rules
    // below therefore target the resolved path.
    {
      name: "no-next-image",
      comment:
        "next/image is incompatible with this static export + user-provided URLs. " +
        "(AGENTS.md → Static Export Constraints)",
      severity: "error",
      from: { path: "^src" },
      to: { path: "^node_modules/next/image(\\.|/|$)" },
    },
    {
      name: "no-css-in-js",
      comment: "Styling is SCSS Modules only. (src/components/AGENTS.md)",
      severity: "error",
      from: { path: "^src" },
      to: {
        path: "^node_modules/(styled-components|@emotion/[^/]+|@stitches/[^/]+)(/|$)",
      },
    },
    {
      name: "no-runtime-fetch-libs",
      comment:
        "Static export — no runtime data fetching. " +
        "(AGENTS.md → Static Export Constraints)",
      severity: "error",
      from: { path: "^src", pathNot: "(__tests__|\\.test\\.)" },
      to: {
        path: "^node_modules/(axios|swr|@tanstack/react-query|ky)(/|$)",
      },
    },
    {
      name: "no-next-server-apis",
      comment:
        "These APIs require a Next.js server runtime and are incompatible " +
        'with `output: "export"`. To fix: derive data at build time via ' +
        "src/lib/data.ts, or expose a static helper. " +
        "(src/pages/AGENTS.md → static-export contract)",
      severity: "error",
      from: { path: "^src" },
      to: {
        path: "^node_modules/(next/(headers|cache|server)|server-only)(\\.|/|$)",
      },
    },

    // ───── Router topology ─────────────────────────────────────────
    {
      name: "app-router-only-sitemap",
      comment:
        "src/app/ is a deliberate Pages-Router exception used solely for sitemap.ts. " +
        "Do not add other files. (src/app/AGENTS.md)",
      severity: "error",
      from: {
        path: "^src/app/",
        pathNot: "(^src/app/sitemap\\.ts$|^src/app/__tests__/)",
      },
      to: {},
    },
    {
      name: "pages-no-cross-import",
      comment:
        "Pages must not import logic from other pages — share via src/lib or src/components. " +
        "Sibling .module.scss is fine. (src/pages/AGENTS.md)",
      severity: "error",
      from: {
        path: "^src/pages/",
        pathNot: "^src/pages/_(app|document)\\.",
      },
      to: {
        path: "^src/pages/.*\\.(ts|tsx)$",
        pathNot: "^src/pages/_(app|document)\\.",
      },
    },

    // ───── Hygiene ─────────────────────────────────────────────────
    {
      name: "no-deep-relative-imports",
      comment:
        "Use the @/* path alias instead of ../../../ across src/. (src/AGENTS.md)",
      severity: "warn",
      from: { path: "^src" },
      to: { path: "^(\\.\\./){3,}" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: {
        orphan: true,
        pathNot:
          "(^src/pages/|^src/app/|\\.d\\.ts$|^src/components/Icons/|" +
          "^src/test/|\\.test\\.|^src/icons/|^src/styles/|^scripts/|^bin/)",
      },
      to: {},
    },
  ],

  options: {
    // No `includeOnly` / `exclude` filter on the cruise: dep-cruiser
    // would otherwise drop external dependencies (e.g. `next/image`,
    // `next/server`, `axios`) BEFORE rule evaluation, silently neutering
    // every ban rule above. `doNotFollow` keeps node_modules out of
    // *traversal* (so we don't descend into transitive deps) while still
    // letting the dependency edge itself be evaluated against rules.
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
