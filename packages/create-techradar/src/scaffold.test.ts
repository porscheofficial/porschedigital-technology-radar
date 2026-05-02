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

import {
  buildPackageJson,
  buildReadme,
  deriveProjectName,
  isDirectoryUsable,
  resolveTargetDir,
  writePackageJson,
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

    it("replaces invalid names with a sane fallback", () => {
      assert.equal(deriveProjectName("###"), "techradar-project");
    });
  });

  describe("isDirectoryUsable", () => {
    it("returns true for missing directories", () => {
      assert.equal(isDirectoryUsable(join(workspace, "nope")), true);
    });

    it("returns true for directories that contain only ignored entries", () => {
      mkdirSync(join(workspace, ".git"));
      assert.equal(isDirectoryUsable(workspace), true);
    });

    it("returns false when other entries exist", () => {
      writeFileSync(join(workspace, "README.md"), "stuff");
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

    it("rejects non-empty directories", () => {
      const dir = join(workspace, "busy");
      mkdirSync(dir);
      writeFileSync(join(dir, "x"), "");
      assert.throws(() => resolveTargetDir("busy", workspace), /not empty/);
    });

    it("rejects empty input", () => {
      assert.throws(
        () => resolveTargetDir("  ", workspace),
        /No target directory/,
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
      assert.equal(json.private, true);
      assert.equal(json.type, "module");
      assert.deepEqual(json.dependencies, { "@x/y": "^1.0.0" });
      assert.deepEqual(json.scripts, {
        dev: "techradar dev",
        build: "techradar build",
        validate: "techradar validate",
      });
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
  });
});
