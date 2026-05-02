import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  detectPackageManager,
  getExecCommand,
  getInstallCommand,
} from "./packageManager.ts";

describe("packageManager", () => {
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

    it("falls back to npm for unknown agents", () => {
      assert.equal(detectPackageManager("pip/24"), "npm");
    });
  });

  describe("getInstallCommand", () => {
    it("uses `<pm> install` for every supported manager", () => {
      assert.deepEqual(getInstallCommand("npm"), {
        command: "npm",
        args: ["install"],
      });
      assert.deepEqual(getInstallCommand("pnpm"), {
        command: "pnpm",
        args: ["install"],
      });
      assert.deepEqual(getInstallCommand("yarn"), {
        command: "yarn",
        args: ["install"],
      });
      assert.deepEqual(getInstallCommand("bun"), {
        command: "bun",
        args: ["install"],
      });
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
  });
});
