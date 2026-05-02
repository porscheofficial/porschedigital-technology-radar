import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { buildLatestUrl, parseLatestVersion } from "./registry.ts";

describe("registry helpers", () => {
  describe("buildLatestUrl", () => {
    it("appends /<package>/latest with no trailing slashes", () => {
      assert.equal(
        buildLatestUrl("@scope/pkg", "https://registry.example.com/"),
        "https://registry.example.com/@scope/pkg/latest",
      );
    });

    it("falls back to the npm registry by default", () => {
      assert.equal(
        buildLatestUrl("foo"),
        "https://registry.npmjs.org/foo/latest",
      );
    });
  });

  describe("parseLatestVersion", () => {
    it("returns the version string from a valid payload", () => {
      assert.equal(
        parseLatestVersion(JSON.stringify({ version: "1.2.3" }), "foo"),
        "1.2.3",
      );
    });

    it("throws ScaffoldError on invalid JSON", () => {
      assert.throws(
        () => parseLatestVersion("not-json", "foo"),
        /invalid JSON/,
      );
    });

    it("throws ScaffoldError when version is missing", () => {
      assert.throws(
        () => parseLatestVersion(JSON.stringify({}), "foo"),
        /missing a "version"/,
      );
    });
  });
});
