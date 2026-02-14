import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const JurisdictionLevel = {
  MUNICIPALITY: "MUNICIPALITY",
  COUNTY: "COUNTY",
  STATE: "STATE",
} as const;
export type JurisdictionLevel = (typeof JurisdictionLevel)[keyof typeof JurisdictionLevel];

export const MetricValueStatus = {
  UNKNOWN: "UNKNOWN",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  MEASURED: "MEASURED",
  DERIVED: "DERIVED",
  FAILED: "FAILED",
} as const;
export type MetricValueStatus = (typeof MetricValueStatus)[keyof typeof MetricValueStatus];

export const SourceReliability = {
  OFFICIAL: "OFFICIAL",
  SECONDARY: "SECONDARY",
  OTHER: "OTHER",
} as const;
export type SourceReliability = (typeof SourceReliability)[keyof typeof SourceReliability];

export type RegistrySource = {
  jurisdictionSlug: string;
  metricKeys: string[];
  url: string;
  contentType: "html_table" | "html_text" | "pdf_text" | "pdf_table" | "json_api";
  reliability: SourceReliability;
  extractorId: string;
};

export type RegistryFile = {
  version: number;
  state: string;
  sources: RegistrySource[];
};

export type CitationInput = {
  sourceUrl: string;
  title?: string;
  publisher?: string;
  locatorText?: string;
  quoteSnippet?: string;
  reliability?: SourceReliability;
  contentType?: string;
  extractorId?: string;
};

export type MetricCandidate = {
  jurisdictionSlug: string;
  metricKey: string;
  status: MetricValueStatus;
  valueNumeric?: number | null;
  valueText?: string | null;
  lastVerified?: string | null;
  confidence?: number | null;
  notes?: string | null;
  citations: CitationInput[];
};

export function rootPath(...parts: string[]): string {
  return path.join(process.cwd(), ...parts);
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export function writeJsonFile(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

export function timestampToken(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function parseMetricStatus(input: string): MetricValueStatus {
  const normalized = input.trim().toUpperCase();
  if (normalized === "MEASURED") return MetricValueStatus.MEASURED;
  if (normalized === "DERIVED") return MetricValueStatus.DERIVED;
  if (normalized === "NOT_APPLICABLE") return MetricValueStatus.NOT_APPLICABLE;
  if (normalized === "FAILED") return MetricValueStatus.FAILED;
  return MetricValueStatus.UNKNOWN;
}

export function jurisdictionLevelFromType(type: string): JurisdictionLevel {
  const normalized = type.trim().toLowerCase();
  if (normalized === "county") return JurisdictionLevel.COUNTY;
  if (normalized === "state") return JurisdictionLevel.STATE;
  return JurisdictionLevel.MUNICIPALITY;
}

export function metricAppliesToLevel(metricDef: {
  appliesMunicipality: boolean;
  appliesCounty: boolean;
  appliesState: boolean;
}, level: string): boolean {
  if (level === JurisdictionLevel.STATE) return metricDef.appliesState;
  if (level === JurisdictionLevel.COUNTY) return metricDef.appliesCounty;
  return metricDef.appliesMunicipality;
}
