#!/usr/bin/env npx tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const run = await prisma.collectionRun.create({
    data: {
      status: "RUNNING",
      trigger: "manual",
      source: "collect:discover",
      notes: "Source discovery started.",
    },
  });

  const sourceCount = await prisma.source.count();

  await prisma.collectionRun.update({
    where: { id: run.id },
    data: {
      status: "COMPLETED",
      finishedAt: new Date(),
      notes: `Source discovery currently uses seeded canonical sources. Existing sources: ${sourceCount}.`,
    },
  });

  console.log(`[collect:discover] Completed. Existing sources: ${sourceCount}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
