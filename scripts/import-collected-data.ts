#!/usr/bin/env npx tsx
/**
 * Import collected research data into the database.
 *
 * Usage:
 *   npx tsx scripts/import-collected-data.ts [path/to/collected-data.json]
 *
 * If no path provided, uses data/collected-data.json
 *
 * JSON format:
 * {
 *   "jurisdictions": { "slug": { "website?", "buildingDeptLink?", ... } },
 *   "metrics": { "slug": { "metricKey": { "valueNumeric", "valueText?", "lastVerified", "notes?", "citations": [{ "sourceUrl", "locatorText?" }] } } },
 *   "feeItems": { "slug": [{ "permitTypeSlug", "feeName", "amount", "sourceUrl?", "notes?" }] }
 * }
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

type CollectedData = {
  jurisdictions?: Record<
    string,
    Partial<{
      website: string;
      buildingDeptLink: string;
      healthDeptLink: string;
      phone: string;
      address: string;
      officeHours: string;
      notes: string;
      lastVerified: string;
    }>
  >;
  metrics?: Record<
    string,
    Record<
      string,
      {
        status?: "MEASURED" | "DERIVED" | "UNKNOWN" | "NOT_APPLICABLE" | "FAILED";
        valueNumeric?: number;
        valueText?: string;
        lastVerified: string;
        notes?: string;
        citations?: { sourceUrl: string; locatorText?: string }[];
      }
    >
  >;
  feeItems?: Record<
    string,
    {
      jurisdictionSlug?: string; // for county-level fees applied to township
      items: {
        permitTypeSlug: string;
        feeName: string;
        amount?: number;
        formulaText?: string;
        sourceUrl?: string;
        notes?: string;
      }[];
    }
  >;
};

async function ensureSource(url: string, title?: string, publisher?: string) {
  const existing = await prisma.source.findUnique({ where: { url } });
  if (existing) return existing;
  return prisma.source.create({
    data: { url, title: title ?? url, publisher: publisher ?? null, retrievedDate: new Date() },
  });
}

async function main() {
  const dataPath =
    process.argv[2] ?? path.join(process.cwd(), "data", "collected-data.json");

  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    console.error("Create data/collected-data.json from research templates.");
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const data: CollectedData = JSON.parse(raw);

  if (data.jurisdictions) {
    for (const [slug, updates] of Object.entries(data.jurisdictions)) {
      const j = await prisma.jurisdiction.findUnique({ where: { slug } });
      if (!j) {
        console.warn(`Jurisdiction not found: ${slug}`);
        continue;
      }
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.lastVerified) {
        updateData.lastVerified = new Date(updates.lastVerified);
      }
      await prisma.jurisdiction.update({
        where: { slug },
        data: updateData,
      });
      console.log(`Updated jurisdiction: ${slug}`);
    }
  }

  if (data.metrics) {
    const metricDefs = await prisma.metricDef.findMany();
    const getDef = (key: string) => metricDefs.find((d) => d.key === key);

    for (const [slug, metrics] of Object.entries(data.metrics)) {
      const j = await prisma.jurisdiction.findUnique({ where: { slug } });
      if (!j) {
        console.warn(`Jurisdiction not found: ${slug}`);
        continue;
      }

      for (const [metricKey, mv] of Object.entries(metrics)) {
        const def = getDef(metricKey);
        if (!def) {
          console.warn(`MetricDef not found: ${metricKey}`);
          continue;
        }

        const existing = await prisma.metricValue.findFirst({
          where: { jurisdictionId: j.id, metricDefId: def.id },
        });

        const valueData = {
          status:
            mv.status ??
            (mv.valueNumeric !== undefined || (mv.valueText != null && mv.valueText.trim() !== "")
              ? "MEASURED"
              : "UNKNOWN"),
          valueNumeric: mv.valueNumeric ?? null,
          valueText: mv.valueText ?? null,
          lastVerified: new Date(mv.lastVerified),
          collectedAt: new Date(mv.lastVerified),
          notes: mv.notes ?? null,
        };

        let createdOrUpdated;
        if (existing) {
          createdOrUpdated = await prisma.metricValue.update({
            where: { id: existing.id },
            data: valueData,
          });
        } else {
          createdOrUpdated = await prisma.metricValue.create({
            data: {
              jurisdictionId: j.id,
              metricDefId: def.id,
              ...valueData,
            },
          });
        }

        if (mv.citations?.length) {
          for (const c of mv.citations) {
            const source = await ensureSource(c.sourceUrl);
            const existingCitation = await prisma.citation.findFirst({
              where: {
                metricValueId: createdOrUpdated.id,
                sourceId: source.id,
              },
            });
            if (!existingCitation) {
              await prisma.citation.create({
                data: {
                  metricValueId: createdOrUpdated.id,
                  sourceId: source.id,
                  locatorText: c.locatorText ?? null,
                },
              });
            }
          }
        }
      }
      console.log(`Updated metrics: ${slug}`);
    }
  }

  if (data.feeItems) {
    const permitTypes = await prisma.permitType.findMany();
    const getPt = (slug: string) => permitTypes.find((p) => p.slug === slug);

    for (const [slug, feeData] of Object.entries(data.feeItems)) {
      const jurisdictionSlug = feeData.jurisdictionSlug ?? slug;
      const j = await prisma.jurisdiction.findUnique({
        where: { slug: jurisdictionSlug },
      });
      if (!j) {
        console.warn(`Jurisdiction not found: ${jurisdictionSlug}`);
        continue;
      }

      for (const item of feeData.items) {
        const pt = getPt(item.permitTypeSlug);
        if (!pt) {
          console.warn(`PermitType not found: ${item.permitTypeSlug}`);
          continue;
        }

        const existing = await prisma.feeItem.findFirst({
          where: {
            jurisdictionId: j.id,
            permitTypeId: pt.id,
            feeName: item.feeName,
          },
        });

        const feeData2 = {
          jurisdictionId: j.id,
          permitTypeId: pt.id,
          feeName: item.feeName,
          amount: item.amount ?? null,
          formulaText: item.formulaText ?? null,
          sourceUrl: item.sourceUrl ?? null,
          notes: item.notes ?? null,
          lastVerifiedDate: new Date(),
        };

        if (existing) {
          await prisma.feeItem.update({
            where: { id: existing.id },
            data: feeData2,
          });
        } else {
          await prisma.feeItem.create({ data: feeData2 });
        }
      }
      console.log(`Updated fee items: ${jurisdictionSlug}`);
    }
  }

  console.log("Import complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
