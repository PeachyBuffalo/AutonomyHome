#!/usr/bin/env npx tsx
import { prisma } from "./shared.ts";
import { runBootstrapJurisdictions } from "./bootstrap-jurisdictions.ts";
import { runDiscoverSources } from "./discover-sources.ts";
import { runExtractMetrics } from "./extract-metrics.ts";
import { runNormalizeMetrics } from "./normalize-metrics.ts";
import { runUpsertMetrics } from "./upsert-metrics.ts";
import { pathToFileURL } from "url";

export async function runCollectAll() {
  const bootstrap = await runBootstrapJurisdictions();
  const discovered = await runDiscoverSources();
  const extracted = await runExtractMetrics();
  const normalized = await runNormalizeMetrics();
  const upsert = await runUpsertMetrics();

  return {
    bootstrap,
    discovered,
    extracted: { count: extracted.count },
    normalized: { count: normalized.count, warnings: normalized.warnings.length },
    upsert,
  };
}

const isMain = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false;

if (isMain) {
  runCollectAll()
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
