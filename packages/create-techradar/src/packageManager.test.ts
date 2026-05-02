import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  detectPackageManager,
  getExecCommand,
  getInstallCommand,
  SUPPORTED_PACKAGE_MANAGERS,
} from "./packageManager.ts";

describe("packageManager", () => {
  describe("SUPPORTED_PACKAGE_MANAGERS", () => {
    it("lists the four supported managers", () => {
      assert.deepEqual(
        [...SUPPORTED_PACKAGE_MANAGERS],
        ["npm", "pnpm", "yarn", "bun"],
      );
    });
  });

  describe("detectPackageManager", () => {
    it("returns npm when no user agent is set", () => {
      assert.equal(detectPackageManager(undefined), "npm");
      assert.equal(detectPackageManager(""), "npm");
    });

    it("detects pnpm/yarn/bun from npm_config_user_agent", () => {
      assert.equal(
        detectPackageManager("pnpm/9.0.0 npm/? node/v22.0.0 darwin arm64"),
        "pnpm",
      );
      assert.equal(
        detectPackageManager("yarn/1.22.22 npm/? node/v22.0.0 darwin arm64"),
        "yarn",
      );
      assert.equal(detectPackageManager("bun/1.1.0"), "bun");
      assert.equal(detectPackageManager("npm/10 node/v22 darwin arm64"), "npm");
    });

    it("is case-insensitive on the manager name", () => {
      assert.equal(detectPackageManager("PNPM/9.0.0 node/v22"), "pnpm");
      assert.equal(detectPackageManager("Yarn/1.22.22"), "yarn");
      assert.equal(detectPackageManager("BUN/1.1.0"), "bun");
    });

    it("falls back to npm for unknown agents", () => {
      assert.equal(detectPackageManager("pip/24"), "npm");
    });

    it("falls back to npm for whitespace-only or version-less input", () => {
      assert.equal(detectPackageManager("   "), "npm");
      assert.equal(detectPackageManager("/1.0.0"), "npm");
    });

    it("handles a name without a version segment", () => {
      assert.equal(detectPackageManager("pnpm"), "pnpm");
    });

    it("only inspects the first whitespace-separated token", () => {
      assert.equal(detectPackageManager("npm/10 pnpm/9"), "npm");
    });
  });

  describe("getInstallCommand", () => {
    it("uses `<pm> install` for every supported manager", () => {
      for (const pm of SUPPORTED_PACKAGE_MANAGERS) {
        assert.deepEqual(getInstallCommand(pm), {
          command: pm,
          args: ["install"],
        });
      }
    });
  });

  describe("getExecCommand", () => {
    it("maps each package manager to its exec convention", () => {
      assert.deepEqual(getExecCommand("npm", "techradar", ["init"]), {
        command: "npx",
        args: ["techradar", "init"],
      });
      assert.deepEqual(getExecCommand("pnpm", "techradar", ["init"]), {
        command: "pnpm",
        args: ["exec", "techradar", "init"],
      });
      assert.deepEqual(getExecCommand("yarn", "techradar", ["init"]), {
        command: "yarn",
        args: ["techradar", "init"],
      });
      assert.deepEqual(getExecCommand("bun", "techradar", ["init"]), {
        command: "bun",
        args: ["x", "techradar", "init"],
      });
    });

    it("defaults binaryArgs to an empty list", () => {
      assert.deepEqual(getExecCommand("npm", "techradar"), {
        command: "npx",
        args: ["techradar"],
      });
      assert.deepEqual(getExecCommand("pnpm", "techradar"), {
        command: "pnpm",
        args: ["exec", "techradar"],
      });
      assert.deepEqual(getExecCommand("bun", "techradar"), {
        command: "bun",
        args: ["x", "techradar"],
      });
    });

    it("forwards multiple binary arguments verbatim", () => {
      assert.deepEqual(getExecCommand("npm", "techradar", ["a", "b", "c"]), {
        command: "npx",
        args: ["techradar", "a", "b", "c"],
      });
    });
  });
});
