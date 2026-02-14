/**
 * Municipal Governance & Buildability Scoring
 * Transparent weights; methodology published.
 */

export type MetricValueRow = {
  key: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
};

/** Metric has a usable value (not null/undefined) */
function hasValue(m: MetricValueRow): boolean {
  if (m.valueNumeric !== null && m.valueNumeric !== undefined) return true;
  const t = m.valueText?.trim();
  return t === "yes" || t === "true" || t === "1" || t === "no" || t === "false" || t === "0";
}

/**
 * Regulatory Intensity (0–100): higher = more friction
 * Weights only metrics with actual values; excludes nulls.
 */
export function computeRegulatoryIntensity(metrics: MetricValueRow[]): {
  score: number | null;
  drivers: { label: string; contribution: number }[];
  metricsUsed: number;
  metricsTotal: number;
} {
  const get = (key: string) =>
    metrics.find((m) => m.key === key)?.valueNumeric ?? null;
  const has = (key: string) => {
    const m = metrics.find((x) => x.key === key);
    return m ? hasValue(m) : false;
  };

  const inputs: { key: string; weight: number; n: number; label: string }[] = [];
  if (has("permit_cost_burden")) {
    const v = get("permit_cost_burden")!;
    inputs.push({ key: "permit_cost_burden", weight: 0.2, n: v, label: "Permit cost burden" });
  }
  if (has("required_permits_count")) {
    const v = get("required_permits_count")!;
    inputs.push({ key: "required_permits_count", weight: 0.15, n: Math.min(v * 10, 100), label: "Required permits" });
  }
  if (has("required_inspections_count")) {
    const v = get("required_inspections_count")!;
    inputs.push({ key: "required_inspections_count", weight: 0.15, n: Math.min(v * 15, 100), label: "Required inspections" });
  }
  if (has("approval_gates_count")) {
    const v = get("approval_gates_count")!;
    inputs.push({ key: "approval_gates_count", weight: 0.2, n: Math.min(v * 20, 100), label: "Approval gates" });
  }
  if (has("avg_permit_processing_days")) {
    const v = get("avg_permit_processing_days")!;
    inputs.push({ key: "avg_permit_processing_days", weight: 0.15, n: Math.min(v * 2, 100), label: "Permit processing time" });
  }

  const totalWeight = inputs.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) {
    return { score: null, drivers: [], metricsUsed: 0, metricsTotal: 5 };
  }
  const scale = 1 / totalWeight;
  const score = inputs.reduce((s, i) => s + i.n * i.weight * scale, 0);
  const drivers = inputs
    .map((i) => ({ label: i.label, contribution: i.n * i.weight * scale }))
    .sort((a, b) => b.contribution - a.contribution);

  return {
    score: Math.round(score * 10) / 10,
    drivers,
    metricsUsed: inputs.length,
    metricsTotal: 5,
  };
}

/**
 * Development Predictability (0–100): higher = more predictable
 * Weights only metrics with actual values.
 */
export function computePredictability(metrics: MetricValueRow[]): {
  score: number | null;
  drivers: { label: string; contribution: number }[];
  metricsUsed: number;
  metricsTotal: number;
} {
  const get = (key: string) =>
    metrics.find((m) => m.key === key)?.valueNumeric ?? null;
  const has = (key: string) => {
    const m = metrics.find((x) => x.key === key);
    return m ? hasValue(m) : false;
  };

  const inputs: { key: string; weight: number; n: number; label: string }[] = [];
  if (has("variance_approval_rate_5yr")) {
    const v = get("variance_approval_rate_5yr")!;
    inputs.push({ key: "variance_approval_rate_5yr", weight: 0.25, n: v, label: "Variance approval rate" });
  }
  if (has("rezoning_approval_rate")) {
    const v = get("rezoning_approval_rate")!;
    inputs.push({ key: "rezoning_approval_rate", weight: 0.25, n: v, label: "Rezoning approval rate" });
  }
  if (has("zoning_amendments_10yr")) {
    const v = get("zoning_amendments_10yr")!;
    inputs.push({ key: "zoning_amendments_10yr", weight: 0.2, n: Math.max(0, 100 - v * 3), label: "Zoning amendments" });
  }
  if (has("zoning_litigation_10yr")) {
    const v = get("zoning_litigation_10yr")!;
    inputs.push({ key: "zoning_litigation_10yr", weight: 0.2, n: Math.max(0, 100 - v * 20), label: "Zoning litigation" });
  }

  const totalWeight = inputs.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) {
    return { score: null, drivers: [], metricsUsed: 0, metricsTotal: 4 };
  }
  const scale = 1 / totalWeight;
  const score = inputs.reduce((s, i) => s + i.n * i.weight * scale, 0);
  const drivers = inputs
    .map((i) => ({ label: i.label, contribution: i.n * i.weight * scale }))
    .sort((a, b) => b.contribution - a.contribution);

  return {
    score: Math.round(score * 10) / 10,
    drivers,
    metricsUsed: inputs.length,
    metricsTotal: 4,
  };
}

/**
 * Fiscal Burden (0–100): higher = more costly
 * Weights only metrics with actual values.
 */
export function computeFiscalBurden(metrics: MetricValueRow[]): {
  score: number | null;
  drivers: { label: string; contribution: number }[];
  metricsUsed: number;
  metricsTotal: number;
} {
  const get = (key: string) =>
    metrics.find((m) => m.key === key)?.valueNumeric ?? null;
  const has = (key: string) => {
    const m = metrics.find((x) => x.key === key);
    return m ? hasValue(m) : false;
  };

  const inputs: { key: string; weight: number; n: number; label: string }[] = [];
  if (has("millage_rate")) {
    const v = get("millage_rate")!;
    inputs.push({ key: "millage_rate", weight: 0.5, n: Math.min(v * 2, 100), label: "Millage rate" });
  }
  if (has("special_assessments_present")) {
    const v = get("special_assessments_present")!;
    inputs.push({ key: "special_assessments_present", weight: 0.25, n: v * 50, label: "Special assessments" });
  }
  if (has("debt_per_capita")) {
    const v = get("debt_per_capita")!;
    inputs.push({ key: "debt_per_capita", weight: 0.25, n: Math.min(v / 50, 50), label: "Debt per capita" });
  }

  const totalWeight = inputs.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) {
    return { score: null, drivers: [], metricsUsed: 0, metricsTotal: 3 };
  }
  const scale = 1 / totalWeight;
  const score = inputs.reduce((s, i) => s + i.n * i.weight * scale, 0);
  const drivers = inputs
    .map((i) => ({ label: i.label, contribution: i.n * i.weight * scale }))
    .sort((a, b) => b.contribution - a.contribution);

  return {
    score: Math.round(score * 10) / 10,
    drivers,
    metricsUsed: inputs.length,
    metricsTotal: 3,
  };
}

/**
 * Administrative Transparency: A+ to F
 * Rubric: fee schedule online, zoning map online, minutes searchable, permit portal, clear checklists
 * Only counts criteria with verified data (null = unknown, not counted).
 */
export function computeTransparencyGrade(metrics: MetricValueRow[]): {
  grade: string | null;
  drivers: { label: string; present: boolean; hasData: boolean }[];
  metricsUsed: number;
  metricsTotal: number;
} {
  const keys = ["fee_schedule_online", "zoning_map_online", "minutes_searchable", "permit_portal", "clear_checklists"] as const;
  const labels: Record<(typeof keys)[number], string> = {
    fee_schedule_online: "Fee schedule published online",
    zoning_map_online: "Zoning map available online",
    minutes_searchable: "Meeting minutes searchable",
    permit_portal: "Permit application portal",
    clear_checklists: "Clear permit checklists",
  };

  const results: { key: (typeof keys)[number]; present: boolean; hasData: boolean }[] = [];
  for (const key of keys) {
    const m = metrics.find((x) => x.key === key);
    const hasData = m ? hasValue(m) : false;
    const present = hasData && (m!.valueNumeric! > 0 || ["yes", "true", "1"].includes((m!.valueText ?? "").toLowerCase()));
    results.push({ key, present, hasData });
  }

  const withData = results.filter((r) => r.hasData);
  const presentCount = withData.filter((r) => r.present).length;

  if (withData.length === 0) {
    return {
      grade: null,
      drivers: results.map((r) => ({ label: labels[r.key], present: r.present, hasData: r.hasData })),
      metricsUsed: 0,
      metricsTotal: 5,
    };
  }

  // Grade: 0=F, 1=D, 2=C-, 3=C, 4=B+, 5=A- (count of verified criteria present)
  const grades = ["F", "D", "C-", "C", "B+", "A-"];
  const grade = grades[Math.min(presentCount, grades.length - 1)];

  return {
    grade,
    drivers: results.map((r) => ({ label: labels[r.key], present: r.present, hasData: r.hasData })),
    metricsUsed: withData.length,
    metricsTotal: 5,
  };
}

/**
 * Data confidence: stars (0–5) and note from path-filtered metrics.
 * 17/17 = 5 stars, 11/17 ≈ 3 stars.
 */
export function computeDataConfidence(metrics: MetricValueRow[]): {
  metricsUsed: number;
  metricsTotal: number;
  stars: number;
  dataQualityNote: string;
} {
  const total = metrics.length;
  const used = metrics.filter(hasValue).length;
  const stars = total === 0 ? 0 : Math.max(0, Math.min(5, Math.round((used / total) * 5)));
  const dataQualityNote = `Based on ${used} of ${total} metrics`;
  return { metricsUsed: used, metricsTotal: total, stars, dataQualityNote };
}

export function getStalenessBadge(lastVerified: Date | null): {
  label: string;
  color: string;
} {
  if (!lastVerified) return { label: "Unknown", color: "bg-stone-600" };
  const days = Math.floor((Date.now() - lastVerified.getTime()) / 86400000);
  if (days < 180) return { label: "Recent", color: "bg-green-600" };
  if (days < 365) return { label: "Check", color: "bg-amber-600" };
  return { label: "Stale", color: "bg-red-600" };
}
