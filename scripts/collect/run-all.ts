#!/usr/bin/env npx tsx

import { execSync } from "node:child_process";

const STEPS = [
  "node --experimental-strip-types scripts/collect/bootstrap-jurisdictions.ts",
  "node --experimental-strip-types scripts/collect/discover-sources.ts",
  "node --experimental-strip-types scripts/collect/extract-metrics.ts",
  "node --experimental-strip-types scripts/collect/social-sentiment.ts",
  "node --experimental-strip-types scripts/collect/normalize-metrics.ts",
  "node --experimental-strip-types scripts/collect/upsert-metrics.ts",
  "node --experimental-strip-types scripts/collect/stale-scan.ts",
];

function main() {
  for (const step of STEPS) {
    console.log(`\n[collect:all] Running: ${step}`);
    execSync(step, { stdio: "inherit" });
  }
  console.log("\n[collect:all] Completed.");
}

main();
