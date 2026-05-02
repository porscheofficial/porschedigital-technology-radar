#!/usr/bin/env node

// src/index.ts
var NOT_IMPLEMENTED_MESSAGE = "@porscheofficial/create-techradar is a workspace skeleton in PR #1. Use @porscheofficial/porschedigital-technology-radar directly for now.";
function runCreateTechradar() {
  console.error(NOT_IMPLEMENTED_MESSAGE);
  return 1;
}

// bin/create-techradar.ts
process.exitCode = runCreateTechradar();
