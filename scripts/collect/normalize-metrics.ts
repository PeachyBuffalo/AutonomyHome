#!/usr/bin/env npx tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRUE_VALUES = new Set(["yes", "true", "1"]);
const FALSE_VALUES = new Set(["no", "false", "0"]);

function parseBooleanText(valueText: string | null): number | null {
  const normalized = valueText?.trim().toLowerCase();
  if (!normalized) return null;
  if (TRUE_VALUES.has(normalized)) return 1;
  if (FALSE_VALUES.has(normalized)) return 0;
  return null;
}

async function main() {
  const booleanDefs = await prisma.metricDef.findMany({
    where: { unit: "boolean" },
    select: { id: true },
  });

  const booleanIds = booleanDefs.map((d) => d.id);
  if (booleanIds.length === 0) {
    console.log("[collect:normalize] No boolean metric definitions found.");
    return;
  }

  const values = await prisma.metricValue.findMany({
    where: {
      metricDefId: { in: booleanIds },
      valueNumeric: null,
      valueText: { not: null },
    },
    select: {
      id: true,
      status: true,
      valueText: true,
    },
  });

  let normalizedCount = 0;
  for (const value of values) {
    const parsed = parseBooleanText(value.valueText);
    if (parsed == null) continue;

    await prisma.metricValue.update({
      where: { id: value.id },
      data: {
        valueNumeric: parsed,
        status: value.status === "UNKNOWN" ? "MEASURED" : value.status,
        notes: "Normalized boolean text to numeric value.",
      },
    });
    normalizedCount += 1;
  }

  console.log(`[collect:normalize] Normalized ${normalizedCount} boolean metric value(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
