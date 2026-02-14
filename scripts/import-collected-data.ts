#!/usr/bin/env npx tsx
/**
 * Import collected research data into the database.
 *
 * Usage:
 *   npx tsx scripts/import-collected-data.ts [path/to/collected-data.v2.json]
 *
 * If no path provided, uses data/collected-data.v2.json, then falls back to data/collected-data.json.
 */

import {
  PrismaClient,
} from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const CollectionRunStatus = {
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

const MetricValueStatus = {
  UNKNOWN: "UNKNOWN",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  MEASURED: "MEASURED",
  DERIVED: "DERIVED",
  FAILED: "FAILED",
} as const;
type MetricValueStatus = (typeof MetricValueStatus)[keyof typeof MetricValueStatus];

const SourceReliability = {
  OFFICIAL: "OFFICIAL",
  SECONDARY: "SECONDARY",
  OTHER: "OTHER",
} as const;
type SourceReliability = (typeof SourceReliability)[keyof typeof SourceReliability];

type CitationInput = {
  sourceUrl: string;
  locatorText?: string;
  title?: string;
  publisher?: string;
  reliability?: SourceReliability;
};

type V2Metric = {
  jurisdictionSlug: string;
  metricKey: string;
  status: MetricValueStatus | string;
  valueNumeric?: number;
  valueText?: string;
  lastVerified?: string;
  confidence?: number;
  notes?: string;
  citations?: CitationInput[];
};

type CollectedDataV2 = {
  version: number;
  collectionRun?: {
    trigger?: string;
    source?: string;
    notes?: string;
  };
  metrics?: V2Metric[];
  feeItems?: Array<{
    jurisdictionSlug: string;
    permitTypeSlug: string;
    feeName: string;
    amount?: number;
    formulaText?: string;
    sourceUrl?: string;
    notes?: string;
  }>;
};

type LegacyCollectedData = {
  jurisdictions?: Record<string, Record<string, unknown>>;
  metrics?: Record<
    string,
    Record<
      string,
      {
        valueNumeric?: number;
        valueText?: string;
        lastVerified?: string;
        notes?: string;
        citations?: { sourceUrl: string; locatorText?: string }[];
      }
    >
  >;
  feeItems?: Record<
    string,
    {
      jurisdictionSlug?: string;
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

function parseStatus(input: string | MetricValueStatus | undefined): MetricValueStatus {
  const value = String(input ?? "UNKNOWN").toUpperCase();
  if (value === "MEASURED") return MetricValueStatus.MEASURED;
  if (value === "DERIVED") return MetricValueStatus.DERIVED;
  if (value === "NOT_APPLICABLE") return MetricValueStatus.NOT_APPLICABLE;
  if (value === "FAILED") return MetricValueStatus.FAILED;
  return MetricValueStatus.UNKNOWN;
}

function metricApplies(level: string, def: { appliesMunicipality: boolean; appliesCounty: boolean; appliesState: boolean }) {
  if (level === "STATE") return def.appliesState;
  if (level === "COUNTY") return def.appliesCounty;
  return def.appliesMunicipality;
}

async function ensureSource(citation: CitationInput) {
  return prisma.source.upsert({
    where: { url: citation.sourceUrl },
    create: {
      url: citation.sourceUrl,
      title: citation.title ?? citation.sourceUrl,
      publisher: citation.publisher ?? null,
      reliability: citation.reliability ?? SourceReliability.OTHER,
      retrievedDate: new Date(),
    },
    update: {
      title: citation.title ?? citation.sourceUrl,
      publisher: citation.publisher ?? null,
      reliability: citation.reliability ?? SourceReliability.OTHER,
      retrievedDate: new Date(),
    },
  });
}

async function importV2(data: CollectedDataV2, sourcePath: string) {
  const run = await prisma.collectionRun.create({
    data: {
      status: CollectionRunStatus.RUNNING,
      trigger: data.collectionRun?.trigger ?? "import",
      source: data.collectionRun?.source ?? sourcePath,
      notes: data.collectionRun?.notes ?? null,
      startedAt: new Date(),
    },
  });

  const metricDefs = await prisma.metricDef.findMany();
  const metricDefByKey = new Map(metricDefs.map((m) => [m.key, m]));

  const jurisdictions = await prisma.jurisdiction.findMany();
  const jurisdictionBySlug = new Map(jurisdictions.map((j) => [j.slug, j]));

  const errors: string[] = [];
  let importedMetrics = 0;

  for (const metric of data.metrics ?? []) {
    const def = metricDefByKey.get(metric.metricKey);
    const jurisdiction = jurisdictionBySlug.get(metric.jurisdictionSlug);
    if (!def || !jurisdiction) {
      errors.push(`Missing metric def or jurisdiction for ${metric.jurisdictionSlug}/${metric.metricKey}`);
      continue;
    }

    if (!metricApplies(jurisdiction.level, def)) {
      errors.push(`Not applicable metric import attempted: ${metric.jurisdictionSlug}/${metric.metricKey}`);
      continue;
    }

    const status = parseStatus(metric.status);
    const citations = metric.citations ?? [];
    if ((status === MetricValueStatus.MEASURED || status === MetricValueStatus.DERIVED) && citations.length === 0) {
      errors.push(`Citation required for measured/derived metric: ${metric.jurisdictionSlug}/${metric.metricKey}`);
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
        status,
        valueNumeric: metric.valueNumeric ?? null,
        valueText: metric.valueText ?? null,
        lastVerified: metric.lastVerified ? new Date(metric.lastVerified) : null,
        confidence: metric.confidence ?? null,
        notes: metric.notes ?? null,
        collectedAt: new Date(),
      },
      update: {
        collectionRunId: run.id,
        status,
        valueNumeric: metric.valueNumeric ?? null,
        valueText: metric.valueText ?? null,
        lastVerified: metric.lastVerified ? new Date(metric.lastVerified) : null,
        confidence: metric.confidence ?? null,
        notes: metric.notes ?? null,
        collectedAt: new Date(),
      },
    });

    for (const citation of citations) {
      const source = await ensureSource(citation);
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
        },
        update: {},
      });
    }

    importedMetrics += 1;
  }

  for (const fee of data.feeItems ?? []) {
    const jurisdiction = jurisdictionBySlug.get(fee.jurisdictionSlug);
    if (!jurisdiction) {
      errors.push(`Fee item jurisdiction missing: ${fee.jurisdictionSlug}`);
      continue;
    }
    const permitType = await prisma.permitType.findUnique({ where: { slug: fee.permitTypeSlug } });
    if (!permitType) {
      errors.push(`Permit type missing: ${fee.permitTypeSlug}`);
      continue;
    }

    await prisma.feeItem.upsert({
      where: {
        id: `${jurisdiction.id}-${permitType.id}-${fee.feeName}`.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80),
      },
      create: {
        id: `${jurisdiction.id}-${permitType.id}-${fee.feeName}`.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80),
        jurisdictionId: jurisdiction.id,
        permitTypeId: permitType.id,
        feeName: fee.feeName,
        amount: fee.amount ?? null,
        formulaText: fee.formulaText ?? null,
        sourceUrl: fee.sourceUrl ?? null,
        notes: fee.notes ?? null,
        lastVerifiedDate: new Date(),
      },
      update: {
        amount: fee.amount ?? null,
        formulaText: fee.formulaText ?? null,
        sourceUrl: fee.sourceUrl ?? null,
        notes: fee.notes ?? null,
        lastVerifiedDate: new Date(),
      },
    });
  }

  await prisma.collectionRun.update({
    where: { id: run.id },
    data: {
      status: errors.length > 0 ? CollectionRunStatus.FAILED : CollectionRunStatus.SUCCESS,
      finishedAt: new Date(),
      notes: errors.length > 0 ? errors.slice(0, 10).join(" | ") : "Import completed",
    },
  });

  console.log(`Imported metrics: ${importedMetrics}`);
  if (errors.length > 0) {
    console.warn(`Import completed with ${errors.length} issues:`);
    for (const error of errors) console.warn(`- ${error}`);
  }
}

async function importLegacy(data: LegacyCollectedData, sourcePath: string) {
  const converted: CollectedDataV2 = {
    version: 2,
    collectionRun: {
      trigger: "import",
      source: sourcePath,
      notes: "Converted legacy collected-data.json payload",
    },
    metrics: [],
    feeItems: [],
  };

  for (const [slug, metrics] of Object.entries(data.metrics ?? {})) {
    for (const [metricKey, row] of Object.entries(metrics)) {
      converted.metrics!.push({
        jurisdictionSlug: slug,
        metricKey,
        status: row.valueNumeric == null && !row.valueText ? "UNKNOWN" : "MEASURED",
        valueNumeric: row.valueNumeric,
        valueText: row.valueText,
        lastVerified: row.lastVerified,
        notes: row.notes,
        citations: (row.citations ?? []).map((c) => ({
          sourceUrl: c.sourceUrl,
          locatorText: c.locatorText,
        })),
      });
    }
  }

  for (const [slug, feeBlock] of Object.entries(data.feeItems ?? {})) {
    const jurisdictionSlug = feeBlock.jurisdictionSlug ?? slug;
    for (const item of feeBlock.items) {
      converted.feeItems!.push({
        jurisdictionSlug,
        permitTypeSlug: item.permitTypeSlug,
        feeName: item.feeName,
        amount: item.amount,
        formulaText: item.formulaText,
        sourceUrl: item.sourceUrl,
        notes: item.notes,
      });
    }
  }

  await importV2(converted, sourcePath);
}

async function main() {
  const defaultV2 = path.join(process.cwd(), "data", "collected-data.v2.json");
  const defaultLegacy = path.join(process.cwd(), "data", "collected-data.json");
  const dataPath = process.argv[2] ?? (fs.existsSync(defaultV2) ? defaultV2 : defaultLegacy);

  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const parsed = JSON.parse(raw) as CollectedDataV2 | LegacyCollectedData;

  if ((parsed as CollectedDataV2).version === 2) {
    await importV2(parsed as CollectedDataV2, dataPath);
  } else {
    await importLegacy(parsed as LegacyCollectedData, dataPath);
  }

  console.log("Import complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
