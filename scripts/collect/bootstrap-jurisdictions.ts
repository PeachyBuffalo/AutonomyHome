#!/usr/bin/env npx tsx

import { execSync } from "node:child_process";

function main() {
  console.log("[collect:bootstrap] Seeding jurisdictions, hierarchy, and metrics...");
  execSync("node --experimental-strip-types prisma/seed.ts", { stdio: "inherit" });
  console.log("[collect:bootstrap] Complete.");
}

main();
