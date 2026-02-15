#!/usr/bin/env npx tsx

import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const STALE_DAYS = 90;

function toTsStamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

async function main() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const staleRows = await prisma.metricValue.findMany({
    where: {
      status: { in: ["MEASURED", "DERIVED"] },
      OR: [{ lastVerified: null }, { lastVerified: { lt: cutoff } }],
    },
    include: {
      jurisdiction: { select: { slug: true, name: true, level: true } },
      metricDef: { select: { key: true, label: true } },
    },
    orderBy: [{ jurisdiction: { slug: "asc" } }, { metricDef: { sortOrder: "asc" } }],
  });

  const grouped = new Map<string, { slug: string; name: string; level: string; metrics: string[] }>();
  for (const row of staleRows) {
    const slug = row.jurisdiction.slug;
    const existing = grouped.get(slug) ?? {
      slug,
      name: row.jurisdiction.name,
      level: row.jurisdiction.level,
      metrics: [],
    };
    existing.metrics.push(row.metricDef.key);
    grouped.set(slug, existing);
  }

  const queue = Array.from(grouped.values());

  const outputDir = path.join(process.cwd(), "output", "reports");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `stale-${toTsStamp(now)}.json`);
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        staleDays: STALE_DAYS,
        staleRowCount: staleRows.length,
        queue,
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );

  console.log(`[collect:stale] Found ${staleRows.length} stale metric row(s).`);
  console.log(`[collect:stale] Queue size: ${queue.length} jurisdiction(s).`);
  console.log(`[collect:stale] Report written: ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
