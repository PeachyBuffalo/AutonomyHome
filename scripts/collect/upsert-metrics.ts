#!/usr/bin/env npx tsx

import { execSync } from "node:child_process";
import * as path from "node:path";

function main() {
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(process.cwd(), "data", "collected-data.json");

  console.log(`[collect:upsert] Importing ${inputPath}`);
  const cmd = `node --experimental-strip-types scripts/import-collected-data.ts ${JSON.stringify(inputPath)}`;
  execSync(cmd, { stdio: "inherit" });
  console.log("[collect:upsert] Complete.");
}

main();
