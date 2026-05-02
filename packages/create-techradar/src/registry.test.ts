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

    it("strips multiple trailing slashes from the registry base", () => {
      assert.equal(
        buildLatestUrl("foo", "https://registry.example.com////"),
        "https://registry.example.com/foo/latest",
      );
    });

    it("leaves a registry without a trailing slash untouched", () => {
      assert.equal(
        buildLatestUrl("foo", "https://registry.example.com"),
        "https://registry.example.com/foo/latest",
      );
    });

    it("preserves a non-root registry path", () => {
      assert.equal(
        buildLatestUrl("@scope/pkg", "https://registry.example.com/mirror/"),
        "https://registry.example.com/mirror/@scope/pkg/latest",
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

    it("ignores extra fields and returns the version", () => {
      assert.equal(
        parseLatestVersion(
          JSON.stringify({ version: "9.0.0", name: "foo", dist: {} }),
          "foo",
        ),
        "9.0.0",
      );
    });

    it("throws ScaffoldError on invalid JSON", () => {
      assert.throws(
        () => parseLatestVersion("not-json", "foo"),
        /invalid JSON/,
      );
    });

    it("throws ScaffoldError on an empty string", () => {
      assert.throws(() => parseLatestVersion("", "foo"), /invalid JSON/);
    });

    it("throws ScaffoldError when version is missing", () => {
      assert.throws(
        () => parseLatestVersion(JSON.stringify({}), "foo"),
        /missing a "version"/,
      );
    });

    it("throws ScaffoldError when version is not a string", () => {
      assert.throws(
        () => parseLatestVersion(JSON.stringify({ version: 1 }), "foo"),
        /missing a "version"/,
      );
    });

    it("throws ScaffoldError when payload is null", () => {
      assert.throws(
        () => parseLatestVersion("null", "foo"),
        /missing a "version"/,
      );
    });

    it("throws ScaffoldError when payload is an array", () => {
      assert.throws(
        () => parseLatestVersion("[]", "foo"),
        /missing a "version"/,
      );
    });

    it("includes the package name in error messages", () => {
      assert.throws(
        () => parseLatestVersion("{}", "@scope/pkg"),
        /@scope\/pkg/,
      );
    });
  });
});
