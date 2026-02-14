#!/usr/bin/env npx tsx
/**
 * Report metric coverage per jurisdiction.
 * Identifies gaps to prioritize data collection.
 *
 * Usage: npm run data:coverage
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hasValue(mv: { valueNumeric: number | null; valueText: string | null }): boolean {
  if (mv.valueNumeric !== null && mv.valueNumeric !== undefined) return true;
  const t = mv.valueText?.trim();
  return t === "yes" || t === "true" || t === "1" || t === "no" || t === "false" || t === "0";
}

async function main() {
  const jurisdictions = await prisma.jurisdiction.findMany({
    where: { type: { in: ["township", "city"] } },
    include: {
      metricValues: {
        include: { metricDef: true },
      },
    },
  });

  const defs = await prisma.metricDef.findMany({ orderBy: { sortOrder: "asc" } });

  console.log("\n=== Metric Coverage Report ===\n");

  for (const j of jurisdictions) {
    const byPath = {
      residential: defs.filter((d) => d.pathResidential),
      commercial: defs.filter((d) => d.pathCommercial),
    };

    for (const [path, defsForPath] of Object.entries(byPath)) {
      const values = defsForPath.map((def) => {
        const mv = j.metricValues.find((v) => v.metricDefId === def.id);
        const filled = mv && hasValue(mv);
        return { def, filled };
      });
      const filledCount = values.filter((v) => v.filled).length;
      const total = values.length;
      const pct = total ? Math.round((filledCount / total) * 100) : 0;

      console.log(`${j.name} (${path})`);
      console.log(`  ${filledCount}/${total} metrics (${pct}%)`);
      const missing = values.filter((v) => !v.filled).map((v) => v.def.key);
      if (missing.length > 0) {
        console.log(`  Missing: ${missing.join(", ")}`);
      }
      console.log("");
    }
  }

  console.log("Run research from docs/research/ and import via data:import");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
