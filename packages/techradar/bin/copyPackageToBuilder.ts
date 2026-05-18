import { cpSync } from "node:fs";

export interface CopyPackageToBuilderOptions {
  sourceDir: string;
  builderDir: string;
  packageName: string;
}

export function copyPackageToBuilder({
  sourceDir,
  builderDir,
  packageName,
}: CopyPackageToBuilderOptions): void {
  cpSync(sourceDir, builderDir, {
    recursive: true,
    dereference: true,
    filter: (src) => !src.includes(`${packageName}/node_modules`),
  });
}
