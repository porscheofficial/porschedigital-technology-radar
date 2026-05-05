import { spawn } from "node:child_process";
import path from "node:path";
import { watch } from "chokidar";
import { buildThemes, THEMES_SOURCE_DIR } from "./buildThemes";

const DEBOUNCE_MS = 100;

async function main(): Promise<void> {
  await buildThemes();

  // dev orchestrator resolves `portless` from the workspace's PATH; equivalent
  // to the prior raw `portless run next dev` npm script. No untrusted input.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const next = spawn("portless", ["run", "next", "dev"], {
    stdio: "inherit",
    shell: false,
  });

  next.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (changedPath: string): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const rel = path.relative(THEMES_SOURCE_DIR, changedPath);
      console.log(`[dev] theme change: ${rel}, rebuilding themes…`);
      buildThemes().catch((err) => {
        console.error("[dev] theme rebuild failed:", err);
      });
    }, DEBOUNCE_MS);
  };

  watch(THEMES_SOURCE_DIR, {
    persistent: true,
    ignoreInitial: true,
    depth: 5,
  })
    .on("add", debounced)
    .on("change", debounced)
    .on("unlink", debounced);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      next.kill(signal);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
