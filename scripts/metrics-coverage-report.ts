#!/usr/bin/env npx tsx

import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

const prisma = new PrismaClient();
const STALE_DAYS = 90;
const PATHS = ["residential", "commercial"] as const;
const STATUSES = ["MEASURED", "DERIVED", "UNKNOWN", "NOT_APPLICABLE", "FAILED"] as const;

type PathName = (typeof PATHS)[number];

type StatusCounts = Record<(typeof STATUSES)[number], number>;

function emptyStatusCounts(): StatusCounts {
  return {
    MEASURED: 0,
    DERIVED: 0,
    UNKNOWN: 0,
    NOT_APPLICABLE: 0,
    FAILED: 0,
  };
}

function normalizeStatus(status: string | null | undefined): (typeof STATUSES)[number] {
  const normalized = (status ?? "UNKNOWN").toUpperCase();
  if (normalized === "MEASURED") return "MEASURED";
  if (normalized === "DERIVED") return "DERIVED";
  if (normalized === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  if (normalized === "FAILED") return "FAILED";
  return "UNKNOWN";
}

function appliesToLevel(
  level: string,
  metricDef: { appliesMunicipality: boolean; appliesCounty: boolean; appliesState: boolean }
): boolean {
  if (level === "STATE") return metricDef.appliesState;
  if (level === "COUNTY") return metricDef.appliesCounty;
  return metricDef.appliesMunicipality;
}

function isPathEnabled(
  pathName: PathName,
  metricDef: { pathResidential: boolean; pathCommercial: boolean }
): boolean {
  return pathName === "residential" ? metricDef.pathResidential : metricDef.pathCommercial;
}

function toTsStamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

async function main() {
  const now = new Date();
  const staleCutoffMs = now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000;

  const [jurisdictions, metricDefs] = await Promise.all([
    prisma.jurisdiction.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      include: {
        metricValues: {
          include: { metricDef: true },
        },
      },
    }),
    prisma.metricDef.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const jurisdictionReports: Array<{
    slug: string;
    name: string;
    type: string;
    level: string;
    path: PathName;
    applicableTotal: number;
    measuredDerived: number;
    statusCounts: StatusCounts;
    missingRows: number;
    staleCount: number;
    coveragePct: number;
  }> = [];

  for (const jurisdiction of jurisdictions) {
    const level = jurisdiction.level?.toUpperCase() ?? "MUNICIPALITY";
    const valuesByMetricDefId = new Map(jurisdiction.metricValues.map((mv) => [mv.metricDefId, mv]));

    for (const pathName of PATHS) {
      const applicableDefs = metricDefs.filter(
        (def) => isPathEnabled(pathName, def) && appliesToLevel(level, def)
      );

      const statusCounts = emptyStatusCounts();
      let missingRows = 0;
      let staleCount = 0;

      for (const def of applicableDefs) {
        const value = valuesByMetricDefId.get(def.id);
        if (!value) {
          missingRows += 1;
          continue;
        }

        const status = normalizeStatus(value.status);
        statusCounts[status] += 1;

        if (
          (status === "MEASURED" || status === "DERIVED") &&
          (!value.lastVerified || value.lastVerified.getTime() < staleCutoffMs)
        ) {
          staleCount += 1;
        }
      }

      const measuredDerived = statusCounts.MEASURED + statusCounts.DERIVED;
      const applicableTotal = applicableDefs.length;
      const coveragePct = applicableTotal > 0 ? Math.round((measuredDerived / applicableTotal) * 100) : 0;

      jurisdictionReports.push({
        slug: jurisdiction.slug,
        name: jurisdiction.name,
        type: jurisdiction.type,
        level,
        path: pathName,
        applicableTotal,
        measuredDerived,
        statusCounts,
        missingRows,
        staleCount,
        coveragePct,
      });
    }
  }

  const totalsMap = new Map<string, {
    level: string;
    path: PathName;
    jurisdictions: number;
    applicableTotal: number;
    measuredDerived: number;
    missingRows: number;
    staleCount: number;
    statusCounts: StatusCounts;
  }>();

  for (const row of jurisdictionReports) {
    const key = `${row.level}::${row.path}`;
    const existing = totalsMap.get(key) ?? {
      level: row.level,
      path: row.path,
      jurisdictions: 0,
      applicableTotal: 0,
      measuredDerived: 0,
      missingRows: 0,
      staleCount: 0,
      statusCounts: emptyStatusCounts(),
    };

    existing.jurisdictions += 1;
    existing.applicableTotal += row.applicableTotal;
    existing.measuredDerived += row.measuredDerived;
    existing.missingRows += row.missingRows;
    existing.staleCount += row.staleCount;
    for (const status of STATUSES) {
      existing.statusCounts[status] += row.statusCounts[status];
    }

    totalsMap.set(key, existing);
  }

  const totalsByLevelPath = Array.from(totalsMap.values()).map((row) => ({
    ...row,
    coveragePct: row.applicableTotal > 0 ? Math.round((row.measuredDerived / row.applicableTotal) * 100) : 0,
  }));

  const report = {
    generatedAt: now.toISOString(),
    staleDays: STALE_DAYS,
    jurisdictionCount: jurisdictions.length,
    metricDefCount: metricDefs.length,
    totalsByLevelPath,
    jurisdictions: jurisdictionReports,
  };

  const outputDir = path.join(process.cwd(), "output", "reports");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, `coverage-${toTsStamp(now)}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + "\n", "utf-8");

  console.log("\n=== Metric Coverage (All Levels) ===\n");
  for (const total of totalsByLevelPath) {
    console.log(
      `${total.level} (${total.path}): ${total.measuredDerived}/${total.applicableTotal} measured+derived (${total.coveragePct}%), missing rows ${total.missingRows}, stale ${total.staleCount}`
    );
  }

  console.log(`\nReport written: ${outputFile}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
