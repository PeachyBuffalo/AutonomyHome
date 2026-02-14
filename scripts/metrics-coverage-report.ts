#!/usr/bin/env npx tsx
/**
 * Report metric coverage per jurisdiction level and output JSON report.
 *
 * Usage: npm run data:coverage:all
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const MetricValueStatus = {
  UNKNOWN: "UNKNOWN",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  MEASURED: "MEASURED",
  DERIVED: "DERIVED",
  FAILED: "FAILED",
} as const;
type MetricValueStatus = (typeof MetricValueStatus)[keyof typeof MetricValueStatus];

const STALE_DAYS = 90;

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function pathApplies(pathName: "residential" | "commercial", def: { pathResidential: boolean; pathCommercial: boolean }) {
  return pathName === "residential" ? def.pathResidential : def.pathCommercial;
}

function levelApplies(
  level: string,
  def: { appliesMunicipality: boolean; appliesCounty: boolean; appliesState: boolean }
) {
  if (level === "STATE") return def.appliesState;
  if (level === "COUNTY") return def.appliesCounty;
  return def.appliesMunicipality;
}

async function main() {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: [{ level: "asc" }, { name: "asc" }],
    include: {
      metricValues: {
        include: {
          metricDef: true,
        },
      },
    },
  });

  const statuses: MetricValueStatus[] = [
    MetricValueStatus.MEASURED,
    MetricValueStatus.DERIVED,
    MetricValueStatus.UNKNOWN,
    MetricValueStatus.NOT_APPLICABLE,
    MetricValueStatus.FAILED,
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    staleDays: STALE_DAYS,
    levels: {
      MUNICIPALITY: { count: 0, paths: {} as Record<string, unknown> },
      COUNTY: { count: 0, paths: {} as Record<string, unknown> },
      STATE: { count: 0, paths: {} as Record<string, unknown> },
    },
    jurisdictions: [] as Array<Record<string, unknown>>,
  };
  type LevelKey = keyof typeof report.levels;

  console.log("\n=== Metric Coverage Report (All Levels) ===\n");

  for (const jurisdiction of jurisdictions) {
    const levelKey = jurisdiction.level as LevelKey;
    report.levels[levelKey].count += 1;

    const jurisdictionPaths: Record<string, unknown> = {};

    for (const pathName of ["residential", "commercial"] as const) {
      const applicable = jurisdiction.metricValues.filter(
        (mv) => pathApplies(pathName, mv.metricDef) && levelApplies(jurisdiction.level, mv.metricDef)
      );

      const statusCounts = Object.fromEntries(statuses.map((s) => [s, 0]));
      let staleCount = 0;

      for (const mv of applicable) {
        statusCounts[mv.status] += 1;
        if (
          (mv.status === MetricValueStatus.MEASURED || mv.status === MetricValueStatus.DERIVED) &&
          (!mv.lastVerified || mv.lastVerified < cutoff)
        ) {
          staleCount += 1;
        }
      }

      const measuredLike = statusCounts.MEASURED + statusCounts.DERIVED;
      const total = applicable.length;
      const pct = total === 0 ? 0 : Math.round((measuredLike / total) * 100);

      jurisdictionPaths[pathName] = {
        applicableMetrics: total,
        measuredLike,
        percentMeasuredLike: pct,
        staleCount,
        statusCounts,
      };

      const levelPath = `${levelKey}:${pathName}`;
      if (!report.levels[levelKey].paths[levelPath]) {
        report.levels[levelKey].paths[levelPath] = {
          applicableMetrics: 0,
          measuredLike: 0,
          staleCount: 0,
          statusCounts: Object.fromEntries(statuses.map((s) => [s, 0])),
        } as Record<string, unknown>;
      }

      const agg = report.levels[levelKey].paths[levelPath] as {
        applicableMetrics: number;
        measuredLike: number;
        staleCount: number;
        statusCounts: Record<string, number>;
      };

      agg.applicableMetrics += total;
      agg.measuredLike += measuredLike;
      agg.staleCount += staleCount;
      for (const status of statuses) {
        agg.statusCounts[status] += statusCounts[status];
      }

      console.log(`${jurisdiction.name} [${jurisdiction.level}] (${pathName})`);
      console.log(
        `  measured/derived: ${measuredLike}/${total} (${pct}%) | stale: ${staleCount}`
      );
      console.log(`  status: ${JSON.stringify(statusCounts)}`);
    }

      report.jurisdictions.push({
      slug: jurisdiction.slug,
      name: jurisdiction.name,
      level: levelKey,
      type: jurisdiction.type,
      paths: jurisdictionPaths,
    });

    console.log("");
  }

  for (const level of Object.keys(report.levels) as Array<keyof typeof report.levels>) {
    for (const pathKey of Object.keys(report.levels[level].paths)) {
      const agg = report.levels[level].paths[pathKey] as {
        applicableMetrics: number;
        measuredLike: number;
      };
      (report.levels[level].paths[pathKey] as { percentMeasuredLike?: number }).percentMeasuredLike =
        agg.applicableMetrics === 0
          ? 0
          : Math.round((agg.measuredLike / agg.applicableMetrics) * 100);
    }
  }

  const outPath = path.join(
    process.cwd(),
    "output",
    "reports",
    `coverage-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  ensureDir(outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

  console.log(`Wrote coverage report: ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
