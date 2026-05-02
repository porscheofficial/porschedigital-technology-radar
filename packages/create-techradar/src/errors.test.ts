import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { ScaffoldError } from "./errors.ts";

describe("ScaffoldError", () => {
  it("is an Error subclass with the custom name", () => {
    const err = new ScaffoldError("boom", "do the thing");
    assert.ok(err instanceof Error);
    assert.ok(err instanceof ScaffoldError);
    assert.equal(err.name, "ScaffoldError");
  });

  it("exposes message and fix verbatim", () => {
    const err = new ScaffoldError("boom", "do the thing");
    assert.equal(err.message, "boom");
    assert.equal(err.fix, "do the thing");
  });

  it("preserves the optional cause without wrapping it", () => {
    const root = new Error("root");
    const err = new ScaffoldError("boom", "fix it", root);
    assert.equal(err.cause, root);
  });

  it("leaves cause undefined when not provided", () => {
    const err = new ScaffoldError("boom", "fix it");
    assert.equal(err.cause, undefined);
  });

  it("accepts a non-Error cause (e.g. a string)", () => {
    const err = new ScaffoldError("boom", "fix it", "string cause");
    assert.equal(err.cause, "string cause");
  });

  it("produces a useful stack trace", () => {
    const err = new ScaffoldError("boom", "fix it");
    assert.ok(typeof err.stack === "string" && err.stack.includes("boom"));
  });
});
