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

// Default weights (configurable)
const WEIGHTS = {
  regulatory_intensity: {
    permit_cost_burden: 0.2,
    required_permits_count: 0.15,
    required_inspections_count: 0.15,
    approval_gates_count: 0.2,
    avg_processing_days: 0.15,
    pos_inspection: 0.15,
  },
  predictability: {
    variance_approval_rate: 0.25,
    rezoning_approval_rate: 0.25,
    ordinance_amendment_frequency: 0.2,
    litigation_count: 0.2,
    timeline_variance: 0.1,
  },
  fiscal_burden: {
    millage_rate: 0.5,
    special_assessments: 0.25,
    debt_per_capita: 0.25,
  },
};

/**
 * Regulatory Intensity (0–100): higher = more friction
 * Components: permit cost, # permits, # inspections, approval gates, processing time
 */
export function computeRegulatoryIntensity(metrics: MetricValueRow[]): {
  score: number;
  drivers: { label: string; contribution: number }[];
} {
  const get = (key: string) =>
    metrics.find((m) => m.key === key)?.valueNumeric ?? null;

  const permitCost = get("permit_cost_burden"); // 0-100 normalized
  const permitCount = get("required_permits_count");
  const inspectionCount = get("required_inspections_count");
  const approvalGates = get("approval_gates_count");
  const processingDays = get("avg_permit_processing_days");

  // Normalize to 0-100 scale (heuristics)
  const n1 = permitCost ?? 50;
  const n2 = Math.min((permitCount ?? 5) * 10, 100);
  const n3 = Math.min((inspectionCount ?? 4) * 15, 100);
  const n4 = Math.min((approvalGates ?? 3) * 20, 100);
  const n5 = Math.min((processingDays ?? 30) * 2, 100);

  const w = WEIGHTS.regulatory_intensity;
  const score =
    n1 * w.permit_cost_burden +
    n2 * w.required_permits_count +
    n3 * w.required_inspections_count +
    n4 * w.approval_gates_count +
    n5 * w.avg_processing_days;

  const drivers = [
    { label: "Permit processing time", contribution: n5 * w.avg_processing_days },
    { label: "Approval gates", contribution: n4 * w.approval_gates_count },
    { label: "Required inspections", contribution: n3 * w.required_inspections_count },
  ].sort((a, b) => b.contribution - a.contribution);

  return { score: Math.round(score * 10) / 10, drivers };
}

/**
 * Development Predictability (0–100): higher = more predictable
 */
export function computePredictability(metrics: MetricValueRow[]): {
  score: number;
  drivers: { label: string; contribution: number }[];
} {
  const get = (key: string) =>
    metrics.find((m) => m.key === key)?.valueNumeric ?? null;

  const varianceRate = get("variance_approval_rate_5yr"); // higher = more predictable
  const rezoningRate = get("rezoning_approval_rate");
  const amendments = get("zoning_amendments_10yr"); // lower = more predictable
  const litigation = get("zoning_litigation_10yr"); // lower = more predictable

  const n1 = varianceRate ?? 70; // 0-100
  const n2 = rezoningRate ?? 70;
  const n3 = Math.max(0, 100 - (amendments ?? 15) * 3); // fewer amendments = higher
  const n4 = Math.max(0, 100 - (litigation ?? 2) * 20); // fewer lawsuits = higher

  const w = WEIGHTS.predictability;
  const score =
    n1 * w.variance_approval_rate +
    n2 * w.rezoning_approval_rate +
    n3 * w.ordinance_amendment_frequency +
    n4 * w.litigation_count;

  const drivers = [
    { label: "Variance approval rate", contribution: n1 * w.variance_approval_rate },
    { label: "Rezoning approval rate", contribution: n2 * w.rezoning_approval_rate },
    { label: "Zoning litigation history", contribution: n4 * w.litigation_count },
  ].sort((a, b) => b.contribution - a.contribution);

  return { score: Math.round(score * 10) / 10, drivers };
}

/**
 * Fiscal Burden (0–100): higher = more costly
 */
export function computeFiscalBurden(metrics: MetricValueRow[]): {
  score: number;
  drivers: { label: string; contribution: number }[];
} {
  const get = (key: string) =>
    metrics.find((m) => m.key === key)?.valueNumeric ?? null;

  const millage = get("millage_rate"); // e.g. 40 = 40 mills
  const specialAssess = get("special_assessments_present"); // 0 or 1
  const debt = get("debt_per_capita"); // dollars

  const n1 = Math.min((millage ?? 35) * 2, 100); // ~50 mills = 100
  const n2 = (specialAssess ?? 0) * 50;
  const n3 = Math.min((debt ?? 0) / 50, 50); // $2500/cap = 50

  const w = WEIGHTS.fiscal_burden;
  const score = n1 * w.millage_rate + n2 * w.special_assessments + n3 * w.debt_per_capita;

  const drivers = [
    { label: "Millage rate", contribution: n1 * w.millage_rate },
    { label: "Special assessments", contribution: n2 * w.special_assessments },
    { label: "Debt per capita", contribution: n3 * w.debt_per_capita },
  ].sort((a, b) => b.contribution - a.contribution);

  return { score: Math.round(score * 10) / 10, drivers };
}

/**
 * Administrative Transparency: A+ to F
 * Rubric: fee schedule online, zoning map online, minutes searchable, permit portal, clear checklists
 */
export function computeTransparencyGrade(metrics: MetricValueRow[]): {
  grade: string;
  drivers: { label: string; present: boolean }[];
} {
  const get = (key: string) => {
    const m = metrics.find((x) => x.key === key);
    const n = m?.valueNumeric;
    const t = m?.valueText?.toLowerCase();
    if (n !== null && n !== undefined) return n > 0;
    if (t === "yes" || t === "true" || t === "1") return true;
    return false;
  };

  const feeSchedule = get("fee_schedule_online");
  const zoningMap = get("zoning_map_online");
  const minutesSearchable = get("minutes_searchable");
  const permitPortal = get("permit_portal");
  const checklists = get("clear_checklists");

  const count = [feeSchedule, zoningMap, minutesSearchable, permitPortal, checklists].filter(
    Boolean
  ).length;

  // 0=F, 1=D, 2=C-, 3=C, 4=B/B+, 5=A-
  const grades = ["F", "D", "C-", "C", "B+", "A-"];
  const grade = grades[Math.min(count, grades.length - 1)];

  const drivers = [
    { label: "Fee schedule published online", present: feeSchedule },
    { label: "Zoning map available online", present: zoningMap },
    { label: "Meeting minutes searchable", present: minutesSearchable },
    { label: "Permit application portal", present: permitPortal },
    { label: "Clear permit checklists", present: checklists },
  ];

  return { grade, drivers };
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
