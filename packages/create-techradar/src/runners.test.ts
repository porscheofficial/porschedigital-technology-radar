import { strict as assert } from "node:assert";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { isCommandOnPath } from "./runners.ts";

// `runners.ts` only spawns real processes for install / techradar init / git
// (per AGENTS scope, exercised manually before release). The `isCommandOnPath`
// helper is pure filesystem + PATH parsing, so it's safe to cover here.
describe("isCommandOnPath", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "create-techradar-runners-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("returns true when the binary exists in a sandboxed PATH directory", () => {
    const binary = join(workspace, "fakecmd");
    writeFileSync(binary, "");
    chmodSync(binary, 0o755);
    assert.equal(isCommandOnPath("fakecmd", { PATH: workspace }), true);
  });

  it("returns false when the binary is not on PATH", () => {
    assert.equal(isCommandOnPath("fakecmd", { PATH: workspace }), false);
  });

  it("returns false when PATH is empty", () => {
    assert.equal(isCommandOnPath("fakecmd", { PATH: "" }), false);
  });

  it("returns false when PATH is missing entirely", () => {
    assert.equal(isCommandOnPath("fakecmd", {}), false);
  });

  it("skips empty segments between PATH delimiters", () => {
    const binary = join(workspace, "fakecmd");
    writeFileSync(binary, "");
    chmodSync(binary, 0o755);
    const path = ["", workspace, ""].join(delimiter);
    assert.equal(isCommandOnPath("fakecmd", { PATH: path }), true);
  });

  it("checks every PATH segment, not only the first", () => {
    const binary = join(workspace, "fakecmd");
    writeFileSync(binary, "");
    chmodSync(binary, 0o755);
    const path = ["/nonexistent-dir-xyz", workspace].join(delimiter);
    assert.equal(isCommandOnPath("fakecmd", { PATH: path }), true);
  });

  it("treats slash-containing input as an explicit path (existing)", () => {
    const binary = join(workspace, "fakecmd");
    writeFileSync(binary, "");
    chmodSync(binary, 0o755);
    assert.equal(isCommandOnPath(binary, { PATH: "" }), true);
  });

  it("treats slash-containing input as an explicit path (missing)", () => {
    assert.equal(
      isCommandOnPath(join(workspace, "missing"), { PATH: workspace }),
      false,
    );
  });

  it("falls back to env.Path when env.PATH is unset", () => {
    const binary = join(workspace, "fakecmd");
    writeFileSync(binary, "");
    chmodSync(binary, 0o755);
    assert.equal(isCommandOnPath("fakecmd", { Path: workspace }), true);
  });
});
