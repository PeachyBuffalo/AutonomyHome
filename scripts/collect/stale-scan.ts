#!/usr/bin/env npx tsx
import { MetricValueStatus, prisma, rootPath, timestampToken, writeJsonFile } from "./shared.ts";
import { pathToFileURL } from "url";

const STALE_DAYS = 90;
const CollectionRunStatus = {
  SUCCESS: "SUCCESS",
} as const;

export async function runStaleScan(days = STALE_DAYS) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const staleRows = await prisma.metricValue.findMany({
    where: {
      status: { in: [MetricValueStatus.MEASURED, MetricValueStatus.DERIVED] },
      OR: [
        { lastVerified: null },
        { lastVerified: { lt: cutoff } },
      ],
    },
    include: {
      jurisdiction: { select: { slug: true, name: true, level: true } },
      metricDef: { select: { key: true, label: true } },
    },
    orderBy: [{ jurisdiction: { name: "asc" } }, { metricDef: { sortOrder: "asc" } }],
  });

  const queue = staleRows.map((row) => ({
    jurisdictionSlug: row.jurisdiction.slug,
    jurisdictionName: row.jurisdiction.name,
    level: row.jurisdiction.level,
    metricKey: row.metricDef.key,
    metricLabel: row.metricDef.label,
    lastVerified: row.lastVerified ? row.lastVerified.toISOString().slice(0, 10) : null,
    status: row.status,
  }));

  const run = await prisma.collectionRun.create({
    data: {
      status: CollectionRunStatus.SUCCESS,
      trigger: "stale_scan",
      source: `stale>${days}d`,
      notes: `Queued ${queue.length} stale metrics for recollection`,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });

  const report = {
    createdAt: new Date().toISOString(),
    days,
    cutoff: cutoff.toISOString().slice(0, 10),
    collectionRunId: run.id,
    queueCount: queue.length,
    queue,
  };

  writeJsonFile(rootPath("output", "reports", `stale-queue-${timestampToken()}.json`), report);
  return report;
}

const isMain = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false;

if (isMain) {
  runStaleScan(process.argv[2] ? Number(process.argv[2]) : STALE_DAYS)
    .then((report) => {
      console.log(`Stale queue generated: ${report.queueCount} metrics`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
