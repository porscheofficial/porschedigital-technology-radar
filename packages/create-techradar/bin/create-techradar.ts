import { defineCommand, runMain } from "citty";

import { runCreateTechradar } from "../src/index.ts";

const main = defineCommand({
  meta: {
    name: "create-techradar",
    description: "Scaffold a new Porsche Digital Technology Radar in seconds.",
  },
  args: {
    directory: {
      type: "positional",
      description: "Directory to scaffold the new radar into.",
      required: true,
    },
  },
  async run({ args }) {
    process.exitCode = await runCreateTechradar({ targetDir: args.directory });
  },
});

await runMain(main);
