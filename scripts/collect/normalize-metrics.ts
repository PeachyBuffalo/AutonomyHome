#!/usr/bin/env npx tsx
import {
  MetricValueStatus,
  prisma,
  readJsonFile,
  rootPath,
  timestampToken,
  writeJsonFile,
} from "./shared.ts";
import type { MetricCandidate } from "./shared.ts";
import { pathToFileURL } from "url";

type ExtractedFile = {
  createdAt: string;
  count: number;
  candidates: MetricCandidate[];
};

function normalizeBoolean(candidate: MetricCandidate): MetricCandidate {
  if (candidate.valueNumeric !== null && candidate.valueNumeric !== undefined) {
    return candidate;
  }
  if (!candidate.valueText) return candidate;
  const t = candidate.valueText.trim().toLowerCase();
  if (["yes", "true", "1"].includes(t)) {
    return { ...candidate, valueNumeric: 1 };
  }
  if (["no", "false", "0"].includes(t)) {
    return { ...candidate, valueNumeric: 0 };
  }
  return candidate;
}

export async function runNormalizeMetrics(extractedPath?: string) {
  const filePath = extractedPath ?? rootPath("tmp", "collect", "extracted-metrics.json");
  const extracted = readJsonFile<ExtractedFile>(filePath);

  const defs = await prisma.metricDef.findMany();
  const defByKey = new Map(defs.map((d) => [d.key, d]));
  const jurisdictions = await prisma.jurisdiction.findMany({ include: { feeItems: true } });

  const warnings: string[] = [];
  const normalized: MetricCandidate[] = [];

  for (const candidate of extracted.candidates) {
    const def = defByKey.get(candidate.metricKey);
    if (!def) {
      warnings.push(`Unknown metric key: ${candidate.metricKey}`);
      continue;
    }

    let next = normalizeBoolean(candidate);

    if (def.unit === "percent" && typeof next.valueNumeric === "number") {
      if (next.valueNumeric < 0 || next.valueNumeric > 100) {
        warnings.push(`Out-of-range percent for ${candidate.metricKey} (${candidate.jurisdictionSlug}): ${next.valueNumeric}`);
      }
    }

    if (def.unit === "boolean" && typeof next.valueNumeric === "number") {
      if (![0, 1].includes(next.valueNumeric)) {
        warnings.push(`Boolean metric ${candidate.metricKey} not normalized to 0/1 for ${candidate.jurisdictionSlug}`);
      }
    }

    if ((next.status === MetricValueStatus.MEASURED || next.status === MetricValueStatus.DERIVED) && next.citations.length === 0) {
      warnings.push(`Measured/derived metric missing citation: ${candidate.jurisdictionSlug}/${candidate.metricKey}`);
      next = { ...next, status: MetricValueStatus.FAILED };
    }

    normalized.push(next);
  }

  // Derive permit cost burden from fee totals when absent.
  const byJurisdiction = new Map<string, MetricCandidate[]>();
  for (const c of normalized) {
    if (!byJurisdiction.has(c.jurisdictionSlug)) byJurisdiction.set(c.jurisdictionSlug, []);
    byJurisdiction.get(c.jurisdictionSlug)!.push(c);
  }

  const municipalityTotals: Array<{
    slug: string;
    total: number;
    citations: MetricCandidate["citations"];
  }> = [];
  for (const jurisdiction of jurisdictions) {
    if (jurisdiction.level !== "MUNICIPALITY") continue;
    const total = jurisdiction.feeItems
      .filter((f) => f.amount != null)
      .reduce((sum, f) => sum + (f.amount ?? 0), 0);
    const sources = Array.from(
      new Set(
        jurisdiction.feeItems
          .map((fee) => fee.sourceUrl)
          .filter((url): url is string => Boolean(url))
      )
    );
    if (total > 0) {
      municipalityTotals.push({
        slug: jurisdiction.slug,
        total,
        citations: sources.map((sourceUrl) => ({
          sourceUrl,
          locatorText: "Fee item totals used for permit cost burden derivation",
        })),
      });
    }
  }

  const totals = municipalityTotals.map((m) => m.total);
  const min = totals.length > 0 ? Math.min(...totals) : 0;
  const max = totals.length > 0 ? Math.max(...totals) : 0;

  for (const municipality of municipalityTotals) {
    const existing = (byJurisdiction.get(municipality.slug) ?? []).find((c) => c.metricKey === "permit_cost_burden");
    if (existing && (existing.status === MetricValueStatus.MEASURED || existing.status === MetricValueStatus.DERIVED)) {
      continue;
    }

    const normalizedScore = max > min
      ? Math.round(((municipality.total - min) / (max - min)) * 100)
      : 50;

    normalized.push({
      jurisdictionSlug: municipality.slug,
      metricKey: "permit_cost_burden",
      status: MetricValueStatus.DERIVED,
      valueNumeric: normalizedScore,
      confidence: 0.7,
      lastVerified: new Date().toISOString().slice(0, 10),
      notes: `Derived from fee item total ${municipality.total.toFixed(2)} against municipality min/max range.`,
      citations: municipality.citations,
    });
  }

  const output = {
    createdAt: new Date().toISOString(),
    count: normalized.length,
    warnings,
    candidates: normalized,
  };

  writeJsonFile(rootPath("tmp", "collect", "normalized-metrics.json"), output);
  writeJsonFile(rootPath("output", "reports", `normalize-${timestampToken()}.json`), {
    createdAt: output.createdAt,
    count: output.count,
    warningCount: warnings.length,
    warnings,
  });

  return output;
}

const isMain = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false;

if (isMain) {
  runNormalizeMetrics(process.argv[2])
    .then((output) => {
      console.log(`Normalized metric candidates: ${output.count}`);
      if (output.warnings.length > 0) {
        console.warn(`Warnings: ${output.warnings.length}`);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
