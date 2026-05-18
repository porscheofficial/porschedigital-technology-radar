import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copyPackageToBuilder } from "../copyPackageToBuilder";

const PACKAGE_NAME = "@porscheofficial/porschedigital-technology-radar";

interface PnpmShapedLayout {
  storePackageDir: string;
  symlinkedPackageDir: string;
  builderDir: string;
}

function buildPnpmShapedLayout(root: string): PnpmShapedLayout {
  const storePackageDir = path.join(
    root,
    "store",
    ".pnpm",
    `${PACKAGE_NAME.replace("/", "+")}@2.2.0`,
    "node_modules",
    PACKAGE_NAME,
  );
  mkdirSync(path.join(storePackageDir, "src", "lib"), { recursive: true });
  mkdirSync(path.join(storePackageDir, "scripts"), { recursive: true });
  mkdirSync(path.join(storePackageDir, "node_modules", "left-pad"), {
    recursive: true,
  });

  writeFileSync(
    path.join(storePackageDir, "package.json"),
    JSON.stringify({ name: PACKAGE_NAME, version: "2.2.0" }),
  );
  writeFileSync(
    path.join(storePackageDir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
  );
  writeFileSync(
    path.join(storePackageDir, "src", "lib", "config.ts"),
    "export default {};\n",
  );
  writeFileSync(
    path.join(storePackageDir, "scripts", "buildData.ts"),
    "console.log('build');\n",
  );
  writeFileSync(
    path.join(storePackageDir, "node_modules", "left-pad", "index.js"),
    "module.exports = () => '';\n",
  );

  // Mimic pnpm's per-entry symlinks: the installed package surface lives at
  // node_modules/<scope>/<name>/, and every top-level entry inside it is a
  // symlink into the .pnpm store directory above. This is the shape that
  // makes realpath() of any file inside the package escape into the store.
  const installRoot = path.join(
    root,
    "consumer",
    "node_modules",
    "@porscheofficial",
    "porschedigital-technology-radar",
  );
  mkdirSync(installRoot, { recursive: true });
  for (const entry of [
    "package.json",
    "tsconfig.json",
    "src",
    "scripts",
    "node_modules",
  ]) {
    symlinkSync(
      path.join(storePackageDir, entry),
      path.join(installRoot, entry),
    );
  }

  const builderDir = path.join(root, "consumer", ".techradar");

  return {
    storePackageDir,
    symlinkedPackageDir: installRoot,
    builderDir,
  };
}

describe("copyPackageToBuilder (pnpm symlinked install)", () => {
  let root: string;
  let layout: PnpmShapedLayout;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "techradar-copy-"));
    layout = buildPnpmShapedLayout(root);
    copyPackageToBuilder({
      sourceDir: layout.symlinkedPackageDir,
      builderDir: layout.builderDir,
      packageName: PACKAGE_NAME,
    });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it.each([
    "package.json",
    "tsconfig.json",
    "src/lib/config.ts",
    "scripts/buildData.ts",
  ])("materialises %s as a real file (no symlink into pnpm store)", (rel) => {
    const stat = lstatSync(path.join(layout.builderDir, rel));
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isFile()).toBe(true);
  });

  it("keeps realpath() of every copied file inside the builder dir", () => {
    const real = realpathSync(
      path.join(layout.builderDir, "scripts", "buildData.ts"),
    );
    expect(real.startsWith(realpathSync(layout.builderDir))).toBe(true);
    expect(real).not.toContain("/.pnpm/");
  });

  it("does not copy nested node_modules/ from the installed package", () => {
    expect(() =>
      lstatSync(path.join(layout.builderDir, "node_modules", "left-pad")),
    ).toThrow(/ENOENT/);
  });
});
