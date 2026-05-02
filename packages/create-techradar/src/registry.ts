import { request } from "node:https";

import { ScaffoldError } from "./errors.ts";

export interface RegistryFetcherOptions {
  registry?: string;
  timeoutMs?: number;
}

const DEFAULT_REGISTRY = "https://registry.npmjs.org";
const DEFAULT_TIMEOUT_MS = 10_000;

export function buildLatestUrl(
  packageName: string,
  registry = DEFAULT_REGISTRY,
): string {
  // Strip trailing slashes via a single linear scan rather than a regex like
  // `/\/+$/`. CodeQL flags any unbounded `+` on caller-supplied input as
  // polynomial-ReDoS even though the worst case here is linear; sidestep the
  // alert and the engine entirely. Priority-3 necessary.
  let end = registry.length;
  while (end > 0 && registry.charCodeAt(end - 1) === 0x2f /* '/' */) {
    end--;
  }
  const base = registry.slice(0, end);
  return `${base}/${packageName}/latest`;
}

export function parseLatestVersion(
  rawJson: string,
  packageName: string,
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (cause) {
    throw new ScaffoldError(
      `Registry returned invalid JSON for ${packageName}.`,
      "Check your network proxy or retry in a moment.",
      cause,
    );
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { version?: unknown }).version !== "string"
  ) {
    throw new ScaffoldError(
      `Registry response for ${packageName} is missing a "version" field.`,
      "Verify the package exists and the registry mirror is healthy.",
    );
  }
  return (parsed as { version: string }).version;
}

export async function fetchLatestVersion(
  packageName: string,
  options: RegistryFetcherOptions = {},
): Promise<string> {
  const url = buildLatestUrl(packageName, options.registry);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const body = await new Promise<string>((resolve, reject) => {
    const req = request(url, { method: "GET" }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const status = res.statusCode ?? 0;
        const text = Buffer.concat(chunks).toString("utf8");
        if (status < 200 || status >= 300) {
          reject(
            new ScaffoldError(
              `Registry request for ${packageName} failed with HTTP ${status}.`,
              "Check your internet connection and any corporate proxy.",
            ),
          );
          return;
        }
        resolve(text);
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(
        new ScaffoldError(
          `Registry request for ${packageName} timed out after ${timeoutMs}ms.`,
          "Retry, or set a faster registry via the npm_config_registry env var.",
        ),
      );
    });
    req.on("error", (cause) => {
      reject(
        cause instanceof ScaffoldError
          ? cause
          : new ScaffoldError(
              `Registry request for ${packageName} failed: ${(cause as Error).message}.`,
              "Check your internet connection and any corporate proxy.",
              cause,
            ),
      );
    });
    req.end();
  });

  return parseLatestVersion(body, packageName);
}
