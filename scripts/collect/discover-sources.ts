#!/usr/bin/env npx tsx
import {
  SourceReliability,
  ensureDir,
  prisma,
  readJsonFile,
  rootPath,
  timestampToken,
  writeJsonFile,
} from "./shared.ts";
import type { RegistryFile } from "./shared.ts";
import { pathToFileURL } from "url";

export async function runDiscoverSources(registryPath?: string) {
  const filePath = registryPath ?? rootPath("data", "source-registry", "mi.json");
  const registry = readJsonFile<RegistryFile>(filePath);

  let linked = 0;
  const missingJurisdictions: string[] = [];

  for (const entry of registry.sources) {
    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { slug: entry.jurisdictionSlug },
    });
    if (!jurisdiction) {
      missingJurisdictions.push(entry.jurisdictionSlug);
      continue;
    }

    const source = await prisma.source.upsert({
      where: { url: entry.url },
      create: {
        url: entry.url,
        title: entry.url,
        publisher: jurisdiction.name,
        reliability: entry.reliability ?? SourceReliability.OTHER,
        contentType: entry.contentType,
        extractorId: entry.extractorId,
      },
      update: {
        publisher: jurisdiction.name,
        reliability: entry.reliability ?? SourceReliability.OTHER,
        contentType: entry.contentType,
        extractorId: entry.extractorId,
        retrievedDate: new Date(),
      },
    });

    await prisma.sourceDoc.upsert({
      where: {
        id: `${jurisdiction.id}-${entry.extractorId}-${entry.metricKeys.join("-")}`
          .replace(/[^a-zA-Z0-9-_]/g, "")
          .slice(0, 120),
      },
      create: {
        id: `${jurisdiction.id}-${entry.extractorId}-${entry.metricKeys.join("-")}`
          .replace(/[^a-zA-Z0-9-_]/g, "")
          .slice(0, 120),
        jurisdictionId: jurisdiction.id,
        url: source.url,
        documentTitle: `Discovered source for ${entry.metricKeys.join(", ")}`,
        filetype: entry.contentType,
        reliability: entry.reliability ?? SourceReliability.OTHER,
        extractorId: entry.extractorId,
      },
      update: {
        url: source.url,
        filetype: entry.contentType,
        reliability: entry.reliability ?? SourceReliability.OTHER,
        extractorId: entry.extractorId,
        retrievedDate: new Date(),
      },
    });

    linked += 1;
  }

  const report = {
    status: "ok",
    createdAt: new Date().toISOString(),
    sourceCount: registry.sources.length,
    linked,
    missingJurisdictions,
  };

  ensureDir(rootPath("output", "reports"));
  writeJsonFile(rootPath("output", "reports", `discovered-sources-${timestampToken()}.json`), report);
  return report;
}

const isMain = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false;

if (isMain) {
  runDiscoverSources(process.argv[2])
    .then((report) => {
      console.log(`Discovered sources: linked ${report.linked}/${report.sourceCount}`);
      if (report.missingJurisdictions.length > 0) {
        console.warn(`Missing jurisdictions: ${report.missingJurisdictions.join(", ")}`);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
