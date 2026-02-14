#!/usr/bin/env npx tsx
import {
  MetricValueStatus,
  SourceReliability,
  metricAppliesToLevel,
  prisma,
  readJsonFile,
  rootPath,
  timestampToken,
  writeJsonFile,
} from "./shared.ts";
import type { MetricCandidate } from "./shared.ts";
import { pathToFileURL } from "url";

const CollectionRunStatus = {
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

type NormalizedFile = {
  createdAt: string;
  count: number;
  warnings: string[];
  candidates: MetricCandidate[];
};

function citationRequired(status: MetricValueStatus): boolean {
  return status === MetricValueStatus.MEASURED || status === MetricValueStatus.DERIVED;
}

export async function runUpsertMetrics(normalizedPath?: string) {
  const filePath = normalizedPath ?? rootPath("tmp", "collect", "normalized-metrics.json");
  const normalized = readJsonFile<NormalizedFile>(filePath);

  const run = await prisma.collectionRun.create({
    data: {
      status: CollectionRunStatus.RUNNING,
      trigger: "manual",
      source: filePath,
      startedAt: new Date(),
      notes: "Collect upsert execution",
    },
  });

  const defs = await prisma.metricDef.findMany();
  const defsByKey = new Map(defs.map((d) => [d.key, d]));
  const jurisdictions = await prisma.jurisdiction.findMany();
  const jurisdictionsBySlug = new Map(jurisdictions.map((j) => [j.slug, j]));

  const errors: string[] = [];
  let upserted = 0;

  for (const candidate of normalized.candidates) {
    const def = defsByKey.get(candidate.metricKey);
    const jurisdiction = jurisdictionsBySlug.get(candidate.jurisdictionSlug);

    if (!def || !jurisdiction) {
      errors.push(`Missing def or jurisdiction for ${candidate.jurisdictionSlug}/${candidate.metricKey}`);
      continue;
    }

    if (!metricAppliesToLevel(def, jurisdiction.level)) {
      errors.push(`Metric not applicable for level ${jurisdiction.level}: ${candidate.jurisdictionSlug}/${candidate.metricKey}`);
      continue;
    }

    if (citationRequired(candidate.status) && candidate.citations.length === 0) {
      errors.push(`Citation required but missing: ${candidate.jurisdictionSlug}/${candidate.metricKey}`);
      continue;
    }

    const metricValue = await prisma.metricValue.upsert({
      where: {
        jurisdictionId_metricDefId: {
          jurisdictionId: jurisdiction.id,
          metricDefId: def.id,
        },
      },
      create: {
        jurisdictionId: jurisdiction.id,
        metricDefId: def.id,
        collectionRunId: run.id,
        status: candidate.status,
        valueNumeric: candidate.valueNumeric ?? null,
        valueText: candidate.valueText ?? null,
        lastVerified: candidate.lastVerified ? new Date(candidate.lastVerified) : null,
        collectedAt: new Date(),
        confidence: candidate.confidence ?? null,
        notes: candidate.notes ?? null,
      },
      update: {
        collectionRunId: run.id,
        status: candidate.status,
        valueNumeric: candidate.valueNumeric ?? null,
        valueText: candidate.valueText ?? null,
        lastVerified: candidate.lastVerified ? new Date(candidate.lastVerified) : null,
        collectedAt: new Date(),
        confidence: candidate.confidence ?? null,
        notes: candidate.notes ?? null,
      },
    });

    for (const citation of candidate.citations) {
      const source = await prisma.source.upsert({
        where: { url: citation.sourceUrl },
        create: {
          url: citation.sourceUrl,
          title: citation.title ?? citation.sourceUrl,
          publisher: citation.publisher ?? null,
          reliability: citation.reliability ?? SourceReliability.OTHER,
          contentType: citation.contentType ?? null,
          extractorId: citation.extractorId ?? null,
          retrievedDate: new Date(),
        },
        update: {
          title: citation.title ?? citation.sourceUrl,
          publisher: citation.publisher ?? null,
          reliability: citation.reliability ?? SourceReliability.OTHER,
          contentType: citation.contentType ?? null,
          extractorId: citation.extractorId ?? null,
          retrievedDate: new Date(),
        },
      });

      await prisma.citation.upsert({
        where: {
          metricValueId_sourceId_locatorText: {
            metricValueId: metricValue.id,
            sourceId: source.id,
            locatorText: citation.locatorText ?? "",
          },
        },
        create: {
          metricValueId: metricValue.id,
          sourceId: source.id,
          locatorText: citation.locatorText ?? null,
          quoteSnippet: citation.quoteSnippet ?? null,
        },
        update: {
          quoteSnippet: citation.quoteSnippet ?? null,
        },
      });
    }

    upserted += 1;
  }

  await prisma.collectionRun.update({
    where: { id: run.id },
    data: {
      status: errors.length > 0 ? CollectionRunStatus.FAILED : CollectionRunStatus.SUCCESS,
      finishedAt: new Date(),
      notes: errors.length > 0 ? errors.slice(0, 10).join(" | ") : "Upsert complete",
    },
  });

  const report = {
    createdAt: new Date().toISOString(),
    collectionRunId: run.id,
    processed: normalized.count,
    upserted,
    errorCount: errors.length,
    errors,
  };

  writeJsonFile(rootPath("output", "reports", `upsert-${timestampToken()}.json`), report);
  return report;
}

const isMain = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false;

if (isMain) {
  runUpsertMetrics(process.argv[2])
    .then((report) => {
      console.log(`Upserted ${report.upserted}/${report.processed} candidates.`);
      if (report.errorCount > 0) {
        console.warn(`Upsert errors: ${report.errorCount}`);
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
