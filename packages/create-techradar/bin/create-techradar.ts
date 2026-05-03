import { defineCommand, runMain } from "citty";
import consola from "consola";

import { runCreateTechradar } from "../src/index.ts";

const main = defineCommand({
  meta: {
    name: "create-techradar",
    description:
      "Scaffold a new technology radar with the Technology Radar Generator in seconds.",
  },
  args: {
    directory: {
      type: "positional",
      description: "Directory to scaffold the new radar into.",
      required: false,
    },
  },
  async run({ args }) {
    let directory = args.directory as string | undefined;
    if (!directory) {
      directory = (await consola.prompt("Where should the radar be created?", {
        type: "text",
        placeholder: "my-radar",
        default: "my-radar",
      })) as string;
      if (typeof directory !== "string" || !directory.trim()) {
        consola.error("No directory provided. Aborting.");
        process.exitCode = 1;
        return;
      }
    }
    process.exitCode = await runCreateTechradar({ targetDir: directory });
  },
});

await runMain(main);
