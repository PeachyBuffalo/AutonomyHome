/**
 * Municipal Governance & Buildability Scoring
 *
 * - No hardcoded default substitutions.
 * - Uses only MEASURED/DERIVED metric rows.
 * - Returns null when component coverage is below threshold.
 */

export type MetricValueRow = {
  key: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  status: string;
};

const COVERAGE_THRESHOLD = 0.6;

function hasRawValue(m: MetricValueRow): boolean {
  if (m.valueNumeric !== null && m.valueNumeric !== undefined) return true;
  const t = m.valueText?.trim().toLowerCase();
  return t === "yes" || t === "true" || t === "1" || t === "no" || t === "false" || t === "0";
}

function isUsable(m: MetricValueRow | undefined): m is MetricValueRow {
  if (!m) return false;
  const measured = m.status === "MEASURED" || m.status === "DERIVED";
  return measured && hasRawValue(m);
}

function coverageMet(used: number, total: number): boolean {
  if (total === 0) return false;
  return used / total >= COVERAGE_THRESHOLD;
}

/**
 * Regulatory Intensity (0-100): higher = more friction.
 */
export function computeRegulatoryIntensity(metrics: MetricValueRow[]): {
  score: number | null;
  drivers: { label: string; contribution: number }[];
  metricsUsed: number;
  metricsTotal: number;
} {
  const keys = [
    "permit_cost_burden",
    "required_permits_count",
    "required_inspections_count",
    "approval_gates_count",
    "avg_permit_processing_days",
  ] as const;

  const byKey = new Map(metrics.map((m) => [m.key, m]));

  const inputs: { weight: number; n: number; label: string }[] = [];

  if (isUsable(byKey.get("permit_cost_burden"))) {
    const v = byKey.get("permit_cost_burden")!.valueNumeric!;
    inputs.push({ weight: 0.2, n: v, label: "Permit cost burden" });
  }
  if (isUsable(byKey.get("required_permits_count"))) {
    const v = byKey.get("required_permits_count")!.valueNumeric!;
    inputs.push({ weight: 0.15, n: Math.min(v * 10, 100), label: "Required permits" });
  }
  if (isUsable(byKey.get("required_inspections_count"))) {
    const v = byKey.get("required_inspections_count")!.valueNumeric!;
    inputs.push({ weight: 0.15, n: Math.min(v * 15, 100), label: "Required inspections" });
  }
  if (isUsable(byKey.get("approval_gates_count"))) {
    const v = byKey.get("approval_gates_count")!.valueNumeric!;
    inputs.push({ weight: 0.2, n: Math.min(v * 20, 100), label: "Approval gates" });
  }
  if (isUsable(byKey.get("avg_permit_processing_days"))) {
    const v = byKey.get("avg_permit_processing_days")!.valueNumeric!;
    inputs.push({ weight: 0.15, n: Math.min(v * 2, 100), label: "Permit processing time" });
  }

  if (!coverageMet(inputs.length, keys.length)) {
    return { score: null, drivers: [], metricsUsed: inputs.length, metricsTotal: keys.length };
  }

  const totalWeight = inputs.reduce((sum, item) => sum + item.weight, 0);
  const scale = totalWeight === 0 ? 0 : 1 / totalWeight;
  const score = inputs.reduce((sum, item) => sum + item.n * item.weight * scale, 0);

  return {
    score: Math.round(score * 10) / 10,
    drivers: inputs
      .map((item) => ({ label: item.label, contribution: item.n * item.weight * scale }))
      .sort((a, b) => b.contribution - a.contribution),
    metricsUsed: inputs.length,
    metricsTotal: keys.length,
  };
}

/**
 * Development Predictability (0-100): higher = more predictable.
 */
export function computePredictability(metrics: MetricValueRow[]): {
  score: number | null;
  drivers: { label: string; contribution: number }[];
  metricsUsed: number;
  metricsTotal: number;
} {
  const keys = [
    "variance_approval_rate_5yr",
    "rezoning_approval_rate",
    "zoning_amendments_10yr",
    "zoning_litigation_10yr",
  ] as const;

  const byKey = new Map(metrics.map((m) => [m.key, m]));
  const inputs: { weight: number; n: number; label: string }[] = [];

  if (isUsable(byKey.get("variance_approval_rate_5yr"))) {
    const v = byKey.get("variance_approval_rate_5yr")!.valueNumeric!;
    inputs.push({ weight: 0.25, n: v, label: "Variance approval rate" });
  }
  if (isUsable(byKey.get("rezoning_approval_rate"))) {
    const v = byKey.get("rezoning_approval_rate")!.valueNumeric!;
    inputs.push({ weight: 0.25, n: v, label: "Rezoning approval rate" });
  }
  if (isUsable(byKey.get("zoning_amendments_10yr"))) {
    const v = byKey.get("zoning_amendments_10yr")!.valueNumeric!;
    inputs.push({ weight: 0.2, n: Math.max(0, 100 - v * 3), label: "Zoning amendments" });
  }
  if (isUsable(byKey.get("zoning_litigation_10yr"))) {
    const v = byKey.get("zoning_litigation_10yr")!.valueNumeric!;
    inputs.push({ weight: 0.2, n: Math.max(0, 100 - v * 20), label: "Zoning litigation" });
  }

  if (!coverageMet(inputs.length, keys.length)) {
    return { score: null, drivers: [], metricsUsed: inputs.length, metricsTotal: keys.length };
  }

  const totalWeight = inputs.reduce((sum, item) => sum + item.weight, 0);
  const scale = totalWeight === 0 ? 0 : 1 / totalWeight;
  const score = inputs.reduce((sum, item) => sum + item.n * item.weight * scale, 0);

  return {
    score: Math.round(score * 10) / 10,
    drivers: inputs
      .map((item) => ({ label: item.label, contribution: item.n * item.weight * scale }))
      .sort((a, b) => b.contribution - a.contribution),
    metricsUsed: inputs.length,
    metricsTotal: keys.length,
  };
}

/**
 * Fiscal Burden (0-100): higher = more costly.
 */
export function computeFiscalBurden(metrics: MetricValueRow[]): {
  score: number | null;
  drivers: { label: string; contribution: number }[];
  metricsUsed: number;
  metricsTotal: number;
} {
  const keys = ["millage_rate", "special_assessments_present", "debt_per_capita"] as const;
  const byKey = new Map(metrics.map((m) => [m.key, m]));
  const inputs: { weight: number; n: number; label: string }[] = [];

  if (isUsable(byKey.get("millage_rate"))) {
    const v = byKey.get("millage_rate")!.valueNumeric!;
    inputs.push({ weight: 0.5, n: Math.min(v * 2, 100), label: "Millage rate" });
  }
  if (isUsable(byKey.get("special_assessments_present"))) {
    const v = byKey.get("special_assessments_present")!.valueNumeric!;
    inputs.push({ weight: 0.25, n: v * 50, label: "Special assessments" });
  }
  if (isUsable(byKey.get("debt_per_capita"))) {
    const v = byKey.get("debt_per_capita")!.valueNumeric!;
    inputs.push({ weight: 0.25, n: Math.min(v / 50, 50), label: "Debt per capita" });
  }

  if (!coverageMet(inputs.length, keys.length)) {
    return { score: null, drivers: [], metricsUsed: inputs.length, metricsTotal: keys.length };
  }

  const totalWeight = inputs.reduce((sum, item) => sum + item.weight, 0);
  const scale = totalWeight === 0 ? 0 : 1 / totalWeight;
  const score = inputs.reduce((sum, item) => sum + item.n * item.weight * scale, 0);

  return {
    score: Math.round(score * 10) / 10,
    drivers: inputs
      .map((item) => ({ label: item.label, contribution: item.n * item.weight * scale }))
      .sort((a, b) => b.contribution - a.contribution),
    metricsUsed: inputs.length,
    metricsTotal: keys.length,
  };
}

/**
 * Administrative Transparency: A- to F
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

  const byKey = new Map(metrics.map((m) => [m.key, m]));

  const results = keys.map((key) => {
    const metric = byKey.get(key);
    const hasData = isUsable(metric);
    const valueNum = metric?.valueNumeric ?? 0;
    const valueText = (metric?.valueText ?? "").trim().toLowerCase();
    const present = hasData && (valueNum > 0 || valueText === "yes" || valueText === "true" || valueText === "1");
    return { key, hasData, present };
  });

  const metricsUsed = results.filter((r) => r.hasData).length;
  if (!coverageMet(metricsUsed, keys.length)) {
    return {
      grade: null,
      drivers: results.map((r) => ({ label: labels[r.key], present: r.present, hasData: r.hasData })),
      metricsUsed,
      metricsTotal: keys.length,
    };
  }

  const presentCount = results.filter((r) => r.present).length;
  const grades = ["F", "D", "C-", "C", "B+", "A-"];

  return {
    grade: grades[Math.min(presentCount, grades.length - 1)],
    drivers: results.map((r) => ({ label: labels[r.key], present: r.present, hasData: r.hasData })),
    metricsUsed,
    metricsTotal: keys.length,
  };
}

/**
 * Data confidence: stars (0-5) and note from path-filtered metrics.
 */
export function computeDataConfidence(metrics: MetricValueRow[]): {
  metricsUsed: number;
  metricsTotal: number;
  stars: number;
  dataQualityNote: string;
} {
  const total = metrics.length;
  const used = metrics.filter((m) => m.status === "MEASURED" || m.status === "DERIVED").length;
  const stars = total === 0 ? 0 : Math.max(0, Math.min(5, Math.round((used / total) * 5)));
  const dataQualityNote = `Based on ${used} of ${total} applicable metrics`;
  return { metricsUsed: used, metricsTotal: total, stars, dataQualityNote };
}

export function getStalenessBadge(lastVerified: Date | null): {
  label: string;
  color: string;
} {
  if (!lastVerified) return { label: "Unknown", color: "bg-stone-600" };
  const days = Math.floor((Date.now() - lastVerified.getTime()) / 86400000);
  if (days < 90) return { label: "Recent", color: "bg-green-600" };
  if (days < 180) return { label: "Check", color: "bg-amber-600" };
  return { label: "Stale", color: "bg-red-600" };
}
