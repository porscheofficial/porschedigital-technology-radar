import { strict as assert } from "node:assert";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { ScaffoldError } from "./errors.ts";
import {
  buildPackageJson,
  buildPnpmWorkspace,
  buildReadme,
  deriveProjectName,
  isDirectoryUsable,
  resolveTargetDir,
  writePackageJson,
  writePnpmWorkspace,
  writeReadme,
} from "./scaffold.ts";

describe("scaffold helpers", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "create-techradar-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  describe("deriveProjectName", () => {
    it("normalises whitespace and casing", () => {
      assert.equal(deriveProjectName("My Radar"), "my-radar");
    });

    it("collapses runs of internal whitespace", () => {
      assert.equal(deriveProjectName("foo   bar\tbaz"), "foo-bar-baz");
    });

    it("trims surrounding whitespace before validating", () => {
      assert.equal(deriveProjectName("  ok-name  "), "ok-name");
    });

    it("preserves a valid scoped npm name", () => {
      assert.equal(deriveProjectName("@scope/pkg"), "@scope/pkg");
    });

    it("preserves underscores, tildes, and dots inside the body", () => {
      assert.equal(deriveProjectName("a_b.c~d-e"), "a_b.c~d-e");
    });

    it("falls back when the name starts with a dot", () => {
      assert.equal(deriveProjectName(".foo"), "techradar-project");
    });

    it("falls back when the name contains uppercase non-letter junk", () => {
      assert.equal(deriveProjectName("###"), "techradar-project");
      assert.equal(deriveProjectName("foo!bar"), "techradar-project");
    });

    it("falls back on an empty input", () => {
      assert.equal(deriveProjectName(""), "techradar-project");
      assert.equal(deriveProjectName("   "), "techradar-project");
    });

    it("accepts very long names that match the npm grammar", () => {
      const long = "a".repeat(214);
      assert.equal(deriveProjectName(long), long);
    });
  });

  describe("isDirectoryUsable", () => {
    it("returns true for missing directories", () => {
      assert.equal(isDirectoryUsable(join(workspace, "nope")), true);
    });

    it("returns true for an empty directory", () => {
      assert.equal(isDirectoryUsable(workspace), true);
    });

    it("returns true for directories that contain only ignored entries", () => {
      mkdirSync(join(workspace, ".git"));
      writeFileSync(join(workspace, ".DS_Store"), "");
      writeFileSync(join(workspace, "Thumbs.db"), "");
      assert.equal(isDirectoryUsable(workspace), true);
    });

    it("returns false when other entries exist", () => {
      writeFileSync(join(workspace, "README.md"), "stuff");
      assert.equal(isDirectoryUsable(workspace), false);
    });

    it("returns false when ignored and non-ignored entries coexist", () => {
      mkdirSync(join(workspace, ".git"));
      writeFileSync(join(workspace, "extra"), "");
      assert.equal(isDirectoryUsable(workspace), false);
    });
  });

  describe("resolveTargetDir", () => {
    it("creates a missing directory and reports it", () => {
      const target = resolveTargetDir("fresh", workspace);
      assert.equal(target.created, true);
      assert.equal(target.projectName, "fresh");
      assert.equal(target.absolutePath, join(workspace, "fresh"));
    });

    it("accepts an existing empty directory without recreating it", () => {
      const target = resolveTargetDir(".", workspace);
      assert.equal(target.created, false);
      assert.equal(target.absolutePath, workspace);
    });

    it("treats absolute paths as absolute, ignoring cwd", () => {
      const abs = join(workspace, "abs-target");
      const target = resolveTargetDir(abs, "/tmp/somewhere-else");
      assert.equal(target.absolutePath, abs);
      assert.equal(target.created, true);
      assert.equal(target.projectName, "abs-target");
    });

    it("derives the project name from the basename", () => {
      const target = resolveTargetDir("nested/inner", workspace);
      assert.equal(target.projectName, "inner");
      assert.equal(target.absolutePath, join(workspace, "nested/inner"));
    });

    it("falls back to the safe project name on a junky basename", () => {
      const target = resolveTargetDir("###", workspace);
      assert.equal(target.projectName, "techradar-project");
    });

    it("rejects non-empty directories", () => {
      const dir = join(workspace, "busy");
      mkdirSync(dir);
      writeFileSync(join(dir, "x"), "");
      assert.throws(() => resolveTargetDir("busy", workspace), /not empty/);
    });

    it("throws ScaffoldError (not generic Error) when input is empty", () => {
      assert.throws(
        () => resolveTargetDir("  ", workspace),
        (err: unknown) =>
          err instanceof ScaffoldError &&
          /No target directory/.test(err.message),
      );
    });
  });

  describe("buildPackageJson", () => {
    it("emits private esm package with framework dep", () => {
      const json = buildPackageJson({
        projectName: "demo",
        frameworkPackage: "@x/y",
        frameworkVersionRange: "^1.0.0",
      });
      assert.equal(json.name, "demo");
      assert.equal(json.version, "0.0.0");
      assert.equal(json.private, true);
      assert.equal(json.type, "module");
      assert.deepEqual(json.dependencies, { "@x/y": "^1.0.0" });
      assert.deepEqual(json.scripts, {
        dev: "techradar dev",
        build: "techradar build",
        validate: "techradar validate",
      });
      assert.deepEqual(
        (json.pnpm as { onlyBuiltDependencies: string[] })
          .onlyBuiltDependencies,
        ["@x/y", "@parcel/watcher", "esbuild", "sharp"],
      );
    });
  });

  describe("buildReadme", () => {
    it("starts with the project name as an H1", () => {
      assert.match(buildReadme("demo"), /^# demo\n/);
    });

    it("links to the create-techradar npm page", () => {
      assert.match(
        buildReadme("demo"),
        /npmjs\.com\/package\/@porscheofficial\/create-techradar/,
      );
    });

    it("documents the dev/build/validate scripts", () => {
      const readme = buildReadme("demo");
      assert.match(readme, /`dev`/);
      assert.match(readme, /`build`/);
      assert.match(readme, /`validate`/);
    });

    it("ends with a trailing newline", () => {
      assert.ok(buildReadme("demo").endsWith("\n"));
    });
  });

  describe("buildPnpmWorkspace", () => {
    it("approves the framework package", () => {
      assert.match(buildPnpmWorkspace("@x/y"), /"@x\/y": true/);
    });

    it("approves @parcel/watcher", () => {
      assert.match(buildPnpmWorkspace("@x/y"), /"@parcel\/watcher": true/);
    });

    it("approves esbuild", () => {
      assert.match(buildPnpmWorkspace("@x/y"), /esbuild: true/);
    });

    it("approves sharp", () => {
      assert.match(buildPnpmWorkspace("@x/y"), /sharp: true/);
    });

    it("ends with a trailing newline", () => {
      assert.ok(buildPnpmWorkspace("@x/y").endsWith("\n"));
    });
  });

  describe("writePackageJson + writeReadme", () => {
    it("writes package.json with trailing newline", () => {
      writePackageJson(workspace, {
        projectName: "demo",
        frameworkPackage: "@x/y",
        frameworkVersionRange: "^1.0.0",
      });
      const raw = readFileSync(join(workspace, "package.json"), "utf8");
      assert.ok(raw.endsWith("\n"));
      assert.equal(JSON.parse(raw).name, "demo");
    });

    it("writes a README.md mentioning the project name", () => {
      writeReadme(workspace, "demo");
      const readme = readFileSync(join(workspace, "README.md"), "utf8");
      assert.match(readme, /^# demo/);
      assert.equal(readme, buildReadme("demo"));
    });

    it("writePnpmWorkspace writes a valid pnpm-workspace.yaml", () => {
      writePnpmWorkspace(workspace, "@x/y");
      const raw = readFileSync(join(workspace, "pnpm-workspace.yaml"), "utf8");
      assert.match(raw, /"@x\/y": true/);
      assert.match(raw, /"@parcel\/watcher": true/);
      assert.match(raw, /esbuild: true/);
      assert.match(raw, /sharp: true/);
      assert.ok(raw.endsWith("\n"));
    });
  });
});
