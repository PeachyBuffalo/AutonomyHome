#!/usr/bin/env npx tsx

import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CollectedPayload = {
  jurisdictions?: Record<string, unknown>;
  metrics?: Record<string, Record<string, unknown>>;
  feeItems?: Record<string, unknown>;
};

async function main() {
  const payloadPath = process.argv[2] ?? path.join(process.cwd(), "data", "collected-data.json");

  const run = await prisma.collectionRun.create({
    data: {
      status: "RUNNING",
      trigger: "manual",
      source: "collect:extract",
      notes: `Extraction run started from ${payloadPath}`,
    },
  });

  if (!fs.existsSync(payloadPath)) {
    await prisma.collectionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        notes: `Collected payload not found: ${payloadPath}`,
      },
    });
    throw new Error(`Collected payload not found: ${payloadPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf-8")) as CollectedPayload;
  const jurisdictionCount = Object.keys(payload.jurisdictions ?? {}).length;
  const metricJurisdictionCount = Object.keys(payload.metrics ?? {}).length;
  const feeCount = Object.keys(payload.feeItems ?? {}).length;

  await prisma.collectionRun.update({
    where: { id: run.id },
    data: {
      status: "COMPLETED",
      finishedAt: new Date(),
      notes: `Parsed payload: ${jurisdictionCount} jurisdiction updates, ${metricJurisdictionCount} metric groups, ${feeCount} fee groups.`,
    },
  });

  console.log(
    `[collect:extract] Parsed payload: ${jurisdictionCount} jurisdiction updates, ${metricJurisdictionCount} metric groups, ${feeCount} fee groups.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
