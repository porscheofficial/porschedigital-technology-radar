export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export const SUPPORTED_PACKAGE_MANAGERS: readonly PackageManager[] = [
  "npm",
  "pnpm",
  "yarn",
  "bun",
];

export function detectPackageManager(
  userAgent: string | undefined,
): PackageManager {
  if (!userAgent) return "npm";
  const head = userAgent.split(" ", 1)[0] ?? "";
  const name = head.split("/", 1)[0]?.toLowerCase() ?? "";
  if ((SUPPORTED_PACKAGE_MANAGERS as readonly string[]).includes(name)) {
    return name as PackageManager;
  }
  return "npm";
}

export function getInstallCommand(pm: PackageManager): {
  command: string;
  args: string[];
} {
  return { command: pm, args: ["install"] };
}

export function getExecCommand(
  pm: PackageManager,
  binary: string,
  binaryArgs: readonly string[] = [],
): { command: string; args: string[] } {
  switch (pm) {
    case "pnpm":
      return { command: "pnpm", args: ["exec", binary, ...binaryArgs] };
    case "yarn":
      return { command: "yarn", args: [binary, ...binaryArgs] };
    case "bun":
      return { command: "bun", args: ["x", binary, ...binaryArgs] };
    case "npm":
    default:
      return { command: "npx", args: [binary, ...binaryArgs] };
  }
}
