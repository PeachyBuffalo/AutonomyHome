#!/usr/bin/env npx tsx
import {
  MetricValueStatus,
  parseMetricStatus,
  prisma,
  readJsonFile,
  rootPath,
  timestampToken,
  writeJsonFile,
} from "./shared.ts";
import type { MetricCandidate, RegistryFile, RegistrySource } from "./shared.ts";
import { pathToFileURL } from "url";

type CollectedV2Metric = {
  jurisdictionSlug: string;
  metricKey: string;
  status: string;
  valueNumeric?: number;
  valueText?: string;
  lastVerified?: string;
  confidence?: number;
  notes?: string;
  citations?: Array<{
    sourceUrl: string;
    title?: string;
    publisher?: string;
    locatorText?: string;
    quoteSnippet?: string;
  }>;
};

type CollectedV2 = {
  version: number;
  metrics: CollectedV2Metric[];
};

type ExtractorFn = (entry: RegistrySource) => Promise<MetricCandidate[]>;

async function fixtureCollectedV2Extractor(entry: RegistrySource): Promise<MetricCandidate[]> {
  const data = readJsonFile<CollectedV2>(rootPath("data", "collected-data.v2.json"));

  return data.metrics
    .filter((m) => m.jurisdictionSlug === entry.jurisdictionSlug)
    .filter((m) => entry.metricKeys.includes(m.metricKey))
    .map((m) => ({
      jurisdictionSlug: m.jurisdictionSlug,
      metricKey: m.metricKey,
      status: parseMetricStatus(m.status),
      valueNumeric: m.valueNumeric ?? null,
      valueText: m.valueText ?? null,
      lastVerified: m.lastVerified ?? null,
      confidence: m.confidence ?? null,
      notes: m.notes ?? null,
      citations: (m.citations ?? []).map((c) => ({
        sourceUrl: c.sourceUrl,
        title: c.title,
        publisher: c.publisher,
        locatorText: c.locatorText,
        quoteSnippet: c.quoteSnippet,
      })),
    }));
}

async function noopExtractor(entry: RegistrySource): Promise<MetricCandidate[]> {
  return entry.metricKeys.map((metricKey) => ({
    jurisdictionSlug: entry.jurisdictionSlug,
    metricKey,
    status: MetricValueStatus.UNKNOWN,
    notes: `No extractor implementation for ${entry.extractorId}`,
    citations: [],
  }));
}

const extractors: Record<string, ExtractorFn> = {
  fixture_collected_v2: fixtureCollectedV2Extractor,
  html_table: noopExtractor,
  html_text: noopExtractor,
  pdf_text: noopExtractor,
  pdf_table: noopExtractor,
  json_api: noopExtractor,
};

export async function runExtractMetrics(registryPath?: string) {
  const filePath = registryPath ?? rootPath("data", "source-registry", "mi.json");
  const registry = readJsonFile<RegistryFile>(filePath);

  const candidates: MetricCandidate[] = [];
  const unsupportedExtractors = new Set<string>();

  for (const entry of registry.sources) {
    const jurisdiction = await prisma.jurisdiction.findUnique({ where: { slug: entry.jurisdictionSlug } });
    if (!jurisdiction) {
      continue;
    }

    const extractor = extractors[entry.extractorId] ?? noopExtractor;
    if (!extractors[entry.extractorId]) {
      unsupportedExtractors.add(entry.extractorId);
    }
    const extracted = await extractor(entry);
    candidates.push(...extracted);
  }

  const output = {
    createdAt: new Date().toISOString(),
    count: candidates.length,
    unsupportedExtractors: Array.from(unsupportedExtractors),
    candidates,
  };

  writeJsonFile(rootPath("tmp", "collect", "extracted-metrics.json"), output);
  writeJsonFile(rootPath("output", "reports", `extract-${timestampToken()}.json`), {
    createdAt: output.createdAt,
    count: output.count,
    unsupportedExtractors: output.unsupportedExtractors,
  });

  return output;
}

const isMain = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false;

if (isMain) {
  runExtractMetrics(process.argv[2])
    .then((output) => {
      console.log(`Extracted metric candidates: ${output.count}`);
      if (output.unsupportedExtractors.length > 0) {
        console.warn(`Unsupported extractors: ${output.unsupportedExtractors.join(", ")}`);
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
