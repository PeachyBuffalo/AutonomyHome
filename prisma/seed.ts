import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

const JurisdictionLevel = {
  MUNICIPALITY: "MUNICIPALITY",
  COUNTY: "COUNTY",
  STATE: "STATE",
} as const;
type JurisdictionLevel = (typeof JurisdictionLevel)[keyof typeof JurisdictionLevel];

const PERMIT_TYPES = [
  { slug: "building", name: "Building Permit", category: "building", sortOrder: 1 },
  { slug: "plan_review", name: "Plan Review", category: "building", sortOrder: 2 },
  { slug: "certificate_of_occupancy", name: "Certificate of Occupancy", category: "building", sortOrder: 3 },
  { slug: "electrical", name: "Electrical Permit", category: "trade", sortOrder: 4 },
  { slug: "plumbing", name: "Plumbing Permit", category: "trade", sortOrder: 5 },
  { slug: "mechanical", name: "Mechanical Permit", category: "trade", sortOrder: 6 },
  { slug: "zoning", name: "Zoning / Land Use", category: "planning", sortOrder: 7 },
  { slug: "driveway", name: "Driveway Permit", category: "planning", sortOrder: 8 },
  { slug: "septic", name: "Septic Permit", category: "environmental", sortOrder: 9 },
  { slug: "well", name: "Well Permit", category: "environmental", sortOrder: 10 },
  { slug: "soil_eval", name: "Soil / Site Evaluation", category: "environmental", sortOrder: 11 },
];

type MetricSeed = {
  key: string;
  label: string;
  unit: string | null;
  windowYears?: number;
  pathResidential: boolean;
  pathCommercial: boolean;
  appliesMunicipality: boolean;
  appliesCounty: boolean;
  appliesState: boolean;
  indexComponent: string | null;
  weight: number | null;
  sortOrder: number;
};

const METRIC_DEFS: MetricSeed[] = [
  { key: "variance_approval_rate_5yr", label: "Variance approval rate (5-year avg)", unit: "percent", windowYears: 5, pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: false, indexComponent: "predictability", weight: 0.25, sortOrder: 1 },
  { key: "rezoning_approval_rate", label: "Rezoning applications approved", unit: "percent", pathResidential: false, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: false, indexComponent: "predictability", weight: 0.25, sortOrder: 2 },
  { key: "avg_permit_processing_days", label: "Average permit processing time", unit: "days", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, indexComponent: "regulatory_intensity", weight: 0.15, sortOrder: 3 },
  { key: "millage_rate", label: "Millage rate", unit: "mills", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: false, indexComponent: "fiscal_burden", weight: 0.5, sortOrder: 4 },
  { key: "zoning_amendments_10yr", label: "Zoning amendments (10-year)", unit: "count", windowYears: 10, pathResidential: false, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, indexComponent: "predictability", weight: 0.2, sortOrder: 5 },
  { key: "zoning_litigation_10yr", label: "Zoning-related litigation (10-year)", unit: "count", windowYears: 10, pathResidential: false, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, indexComponent: "predictability", weight: 0.2, sortOrder: 6 },
  { key: "required_permits_count", label: "Required permits (typical SFH)", unit: "count", pathResidential: true, pathCommercial: false, appliesMunicipality: true, appliesCounty: false, appliesState: false, indexComponent: "regulatory_intensity", weight: 0.15, sortOrder: 7 },
  { key: "required_inspections_count", label: "Required inspections", unit: "count", pathResidential: true, pathCommercial: false, appliesMunicipality: true, appliesCounty: false, appliesState: false, indexComponent: "regulatory_intensity", weight: 0.15, sortOrder: 8 },
  { key: "approval_gates_count", label: "Approval gates", unit: "count", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, indexComponent: "regulatory_intensity", weight: 0.2, sortOrder: 9 },
  { key: "permit_cost_burden", label: "Permit cost burden (normalized 0-100)", unit: "score", pathResidential: true, pathCommercial: false, appliesMunicipality: true, appliesCounty: false, appliesState: false, indexComponent: "regulatory_intensity", weight: 0.2, sortOrder: 10 },
  { key: "fee_schedule_online", label: "Fee schedule published online", unit: "boolean", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, indexComponent: "transparency", weight: 0.2, sortOrder: 11 },
  { key: "zoning_map_online", label: "Zoning map available online", unit: "boolean", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: false, indexComponent: "transparency", weight: 0.2, sortOrder: 12 },
  { key: "minutes_searchable", label: "Meeting minutes searchable", unit: "boolean", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, indexComponent: "transparency", weight: 0.2, sortOrder: 13 },
  { key: "permit_portal", label: "Permit application portal", unit: "boolean", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, indexComponent: "transparency", weight: 0.2, sortOrder: 14 },
  { key: "clear_checklists", label: "Clear permit checklists", unit: "boolean", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, indexComponent: "transparency", weight: 0.2, sortOrder: 15 },
  { key: "special_assessments_present", label: "Special assessments present", unit: "boolean", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: false, indexComponent: "fiscal_burden", weight: 0.25, sortOrder: 16 },
  { key: "debt_per_capita", label: "Debt per capita", unit: "dollars", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, indexComponent: "fiscal_burden", weight: 0.25, sortOrder: 17 },

  { key: "county_health_permit_processing_days", label: "County health permit processing days", unit: "days", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: true, appliesState: false, indexComponent: null, weight: null, sortOrder: 18 },
  { key: "county_road_permit_processing_days", label: "County road permit processing days", unit: "days", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: true, appliesState: false, indexComponent: null, weight: null, sortOrder: 19 },
  { key: "county_zoning_authority_present", label: "County zoning authority present", unit: "boolean", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: true, appliesState: false, indexComponent: null, weight: null, sortOrder: 20 },
  { key: "county_land_use_appeal_approval_rate_5yr", label: "County land use appeal approval rate (5-year)", unit: "percent", windowYears: 5, pathResidential: false, pathCommercial: true, appliesMunicipality: false, appliesCounty: true, appliesState: false, indexComponent: null, weight: null, sortOrder: 21 },
  { key: "state_environmental_permit_processing_days", label: "State environmental permit processing days", unit: "days", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, indexComponent: null, weight: null, sortOrder: 22 },
  { key: "state_business_filing_turnaround_days", label: "State business filing turnaround days", unit: "days", pathResidential: false, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, indexComponent: null, weight: null, sortOrder: 23 },
  { key: "state_code_cycle_lag_months", label: "State code cycle lag (months)", unit: "count", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, indexComponent: null, weight: null, sortOrder: 24 },
  { key: "state_land_use_statute_amendments_10yr", label: "State land use statute amendments (10-year)", unit: "count", windowYears: 10, pathResidential: false, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, indexComponent: null, weight: null, sortOrder: 25 },
  { key: "state_property_tax_burden_index", label: "State property tax burden index", unit: "score", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, indexComponent: null, weight: null, sortOrder: 26 },
];

type JurisdictionSeed = {
  name: string;
  slug: string;
  type: string;
  level: JurisdictionLevel;
  county: string | null;
  state: string;
  website?: string | null;
  phone?: string | null;
  buildingDeptLink?: string | null;
  healthDeptLink?: string | null;
  address?: string | null;
  officeHours?: string | null;
  notes?: string | null;
  parentSlug: string | null;
  lastVerified: Date;
};

const BASE_JURISDICTIONS: JurisdictionSeed[] = [
  {
    name: "Michigan",
    slug: "michigan",
    type: "state",
    level: JurisdictionLevel.STATE,
    county: null,
    state: "MI",
    website: "https://www.michigan.gov",
    notes: "State-level profile for statewide metrics.",
    parentSlug: null,
    lastVerified: new Date("2026-02-14"),
  },
  {
    name: "Ottawa County",
    slug: "ottawa-county",
    type: "county",
    level: JurisdictionLevel.COUNTY,
    county: null,
    state: "MI",
    website: "https://miottawa.org",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: "(616) 393-5645",
    notes: "Environmental health: septic, well, soil evaluation. Building permits at municipality level.",
    parentSlug: "michigan",
    lastVerified: new Date("2026-02-14"),
  },
  {
    name: "Holland Charter Township",
    slug: "holland-charter-township",
    type: "township",
    level: JurisdictionLevel.MUNICIPALITY,
    county: "Ottawa",
    state: "MI",
    website: "https://www.hct.holland.mi.us",
    buildingDeptLink: "https://www.hct.holland.mi.us/permits",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: "(616) 396-2345",
    address: "353 N. 120th Avenue, Holland, MI 49424",
    officeHours: "Mon-Fri 8am-5pm",
    notes: "Ottawa County township. Septic/well permits via Ottawa County Health.",
    parentSlug: "ottawa-county",
    lastVerified: new Date("2026-02-14"),
  },
  {
    name: "Olive Township",
    slug: "olive-township",
    type: "township",
    level: JurisdictionLevel.MUNICIPALITY,
    county: "Ottawa",
    state: "MI",
    website: "https://www.olivetownship.org",
    buildingDeptLink: "https://www.olivetownship.org/permits-fee-schedules",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    notes: "Ottawa County township. Fee schedule effective 01/01/2025.",
    parentSlug: "ottawa-county",
    lastVerified: new Date("2026-02-14"),
  },
  {
    name: "Georgetown Township",
    slug: "georgetown-township",
    type: "township",
    level: JurisdictionLevel.MUNICIPALITY,
    county: "Ottawa",
    state: "MI",
    website: "https://www.gtwp.com",
    buildingDeptLink: "https://www.gtwp.com/193/Forms",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: "(616) 457-2340",
    address: "1515 Baldwin St., Jenison, MI 49428",
    notes: "Uses Professional Code Inspections (PCI) for building.",
    parentSlug: "ottawa-county",
    lastVerified: new Date("2026-02-14"),
  },
];

function appliesToLevel(def: MetricSeed, level: string): boolean {
  if (level === JurisdictionLevel.STATE) return def.appliesState;
  if (level === JurisdictionLevel.COUNTY) return def.appliesCounty;
  return def.appliesMunicipality;
}

async function ensureSource(url: string, title: string, publisher: string | null, reliability: SourceReliability = SourceReliability.OFFICIAL) {
  return prisma.source.upsert({
    where: { url },
    create: { url, title, publisher, reliability, retrievedDate: new Date() },
    update: { title, publisher, reliability, retrievedDate: new Date() },
  });
}

async function upsertMetricValue(params: {
  jurisdictionId: string;
  metricDefId: string;
  status: MetricValueStatus;
  valueNumeric?: number | null;
  valueText?: string | null;
  confidence?: number | null;
  notes?: string | null;
  lastVerified?: Date | null;
  sourceUrl?: string;
  sourceTitle?: string;
  sourcePublisher?: string | null;
}) {
  const existing = await prisma.metricValue.findUnique({
    where: {
      jurisdictionId_metricDefId: {
        jurisdictionId: params.jurisdictionId,
        metricDefId: params.metricDefId,
      },
    },
  });

  const mv = existing
    ? await prisma.metricValue.update({
        where: { id: existing.id },
        data: {
          status: params.status,
          valueNumeric: params.valueNumeric ?? null,
          valueText: params.valueText ?? null,
          confidence: params.confidence ?? null,
          notes: params.notes ?? null,
          lastVerified: params.lastVerified ?? null,
          collectedAt: new Date(),
        },
      })
    : await prisma.metricValue.create({
        data: {
          jurisdictionId: params.jurisdictionId,
          metricDefId: params.metricDefId,
          status: params.status,
          valueNumeric: params.valueNumeric ?? null,
          valueText: params.valueText ?? null,
          confidence: params.confidence ?? null,
          notes: params.notes ?? null,
          lastVerified: params.lastVerified ?? null,
          collectedAt: new Date(),
        },
      });

  if (params.sourceUrl) {
    const source = await ensureSource(
      params.sourceUrl,
      params.sourceTitle ?? params.sourceUrl,
      params.sourcePublisher ?? null,
      SourceReliability.OFFICIAL
    );

    await prisma.citation.upsert({
      where: {
        metricValueId_sourceId_locatorText: {
          metricValueId: mv.id,
          sourceId: source.id,
          locatorText: params.notes ?? "",
        },
      },
      create: {
        metricValueId: mv.id,
        sourceId: source.id,
        locatorText: params.notes ?? null,
      },
      update: {},
    });
  }
}

async function main() {
  for (const pt of PERMIT_TYPES) {
    await prisma.permitType.upsert({ where: { slug: pt.slug }, create: pt, update: pt });
  }

  for (const def of METRIC_DEFS) {
    await prisma.metricDef.upsert({
      where: { key: def.key },
      create: def,
      update: def,
    });
  }

  // Upsert base hierarchy.
  for (const j of BASE_JURISDICTIONS) {
    await prisma.jurisdiction.upsert({
      where: { slug: j.slug },
      create: {
        name: j.name,
        slug: j.slug,
        type: j.type,
        level: j.level,
        county: j.county,
        state: j.state,
        website: j.website,
        phone: j.phone ?? null,
        buildingDeptLink: j.buildingDeptLink ?? null,
        healthDeptLink: j.healthDeptLink ?? null,
        address: j.address ?? null,
        officeHours: j.officeHours ?? null,
        notes: j.notes,
        lastVerified: j.lastVerified,
      },
      update: {
        name: j.name,
        type: j.type,
        level: j.level,
        county: j.county,
        state: j.state,
        website: j.website,
        phone: j.phone ?? null,
        buildingDeptLink: j.buildingDeptLink ?? null,
        healthDeptLink: j.healthDeptLink ?? null,
        address: j.address ?? null,
        officeHours: j.officeHours ?? null,
        notes: j.notes,
        lastVerified: j.lastVerified,
      },
    });
  }

  const jurisdictions = await prisma.jurisdiction.findMany();
  const bySlug = new Map(jurisdictions.map((j) => [j.slug, j]));

  for (const j of BASE_JURISDICTIONS) {
    if (!j.parentSlug) continue;
    const child = bySlug.get(j.slug);
    const parent = bySlug.get(j.parentSlug);
    if (!child || !parent) continue;
    if (child.parentId !== parent.id) {
      await prisma.jurisdiction.update({
        where: { id: child.id },
        data: { parentId: parent.id },
      });
    }
  }

  const defs = await prisma.metricDef.findMany();
  const defByKey = new Map(defs.map((d) => [d.key, d]));

  // Ensure every applicable metric row exists with explicit status.
  for (const j of jurisdictions) {
    for (const def of METRIC_DEFS) {
      if (!appliesToLevel(def, j.level)) continue;
      await prisma.metricValue.upsert({
        where: {
          jurisdictionId_metricDefId: {
            jurisdictionId: j.id,
            metricDefId: defByKey.get(def.key)!.id,
          },
        },
        create: {
          jurisdictionId: j.id,
          metricDefId: defByKey.get(def.key)!.id,
          status: MetricValueStatus.UNKNOWN,
          notes: "Not yet collected",
          collectedAt: new Date(),
        },
        update: {},
      });
    }
  }

  const holland = bySlug.get("holland-charter-township");
  const olive = bySlug.get("olive-township");
  const georgetown = bySlug.get("georgetown-township");

  if (holland) {
    await upsertMetricValue({
      jurisdictionId: holland.id,
      metricDefId: defByKey.get("millage_rate")!.id,
      status: MetricValueStatus.MEASURED,
      valueNumeric: 31.98,
      notes: "2025 Total PRE, Holland school district.",
      lastVerified: new Date("2026-02-14"),
      sourceUrl: "https://www.hct.holland.mi.us/departments/treasurer/tax-millage-rates",
      sourceTitle: "2025 Tax Millage Rates",
      sourcePublisher: "Holland Charter Township",
    });
    await upsertMetricValue({
      jurisdictionId: holland.id,
      metricDefId: defByKey.get("required_permits_count")!.id,
      status: MetricValueStatus.MEASURED,
      valueNumeric: 6,
      notes: "Building, electrical, mechanical, plumbing, septic, well.",
      lastVerified: new Date("2026-02-14"),
      sourceUrl: "https://www.hct.holland.mi.us/permits",
      sourceTitle: "Building Permits",
      sourcePublisher: "Holland Charter Township",
    });
    await upsertMetricValue({
      jurisdictionId: holland.id,
      metricDefId: defByKey.get("approval_gates_count")!.id,
      status: MetricValueStatus.MEASURED,
      valueNumeric: 3,
      notes: "Zoning, building, Ottawa County health.",
      lastVerified: new Date("2026-02-14"),
      sourceUrl: "https://www.hct.holland.mi.us/permits",
      sourceTitle: "Building Permits",
      sourcePublisher: "Holland Charter Township",
    });
    await upsertMetricValue({
      jurisdictionId: holland.id,
      metricDefId: defByKey.get("fee_schedule_online")!.id,
      status: MetricValueStatus.MEASURED,
      valueNumeric: 1,
      notes: "Info packets contain fee information.",
      lastVerified: new Date("2026-02-14"),
      sourceUrl: "https://www.hct.holland.mi.us/forms/building-department-forms-information-packets/information-packets",
      sourceTitle: "Building Department Information Packets",
      sourcePublisher: "Holland Charter Township",
    });
    await upsertMetricValue({
      jurisdictionId: holland.id,
      metricDefId: defByKey.get("permit_portal")!.id,
      status: MetricValueStatus.MEASURED,
      valueNumeric: 0,
      notes: "Applications are submitted via office/mail.",
      lastVerified: new Date("2026-02-14"),
      sourceUrl: "https://www.hct.holland.mi.us/permits",
      sourceTitle: "Building Permits",
      sourcePublisher: "Holland Charter Township",
    });
  }

  if (olive) {
    await upsertMetricValue({
      jurisdictionId: olive.id,
      metricDefId: defByKey.get("required_permits_count")!.id,
      status: MetricValueStatus.MEASURED,
      valueNumeric: 6,
      notes: "Building, electrical, mechanical, plumbing, septic, well.",
      lastVerified: new Date("2026-02-14"),
      sourceUrl: "https://www.olivetownship.org/permits-fee-schedules",
      sourceTitle: "Permit Fee Schedule",
      sourcePublisher: "Olive Township",
    });
    await upsertMetricValue({ jurisdictionId: olive.id, metricDefId: defByKey.get("required_inspections_count")!.id, status: MetricValueStatus.MEASURED, valueNumeric: 6, notes: "Typical new SFH inspection pattern from fee schedule.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.olivetownship.org/permits-fee-schedules", sourceTitle: "Permit Fee Schedule", sourcePublisher: "Olive Township" });
    await upsertMetricValue({ jurisdictionId: olive.id, metricDefId: defByKey.get("approval_gates_count")!.id, status: MetricValueStatus.MEASURED, valueNumeric: 3, notes: "Zoning, building, county health.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.olivetownship.org/permits-fee-schedules", sourceTitle: "Permit Fee Schedule", sourcePublisher: "Olive Township" });
    await upsertMetricValue({ jurisdictionId: olive.id, metricDefId: defByKey.get("permit_cost_burden")!.id, status: MetricValueStatus.DERIVED, valueNumeric: 63, notes: "Trades $665 + septic $535 + well $445 = $1645; normalized.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.olivetownship.org/permits-fee-schedules", sourceTitle: "Permit Fee Schedule", sourcePublisher: "Olive Township" });
    await upsertMetricValue({ jurisdictionId: olive.id, metricDefId: defByKey.get("fee_schedule_online")!.id, status: MetricValueStatus.MEASURED, valueNumeric: 1, notes: "Fee schedule published.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.olivetownship.org/permits-fee-schedules", sourceTitle: "Permit Fee Schedule", sourcePublisher: "Olive Township" });
    await upsertMetricValue({ jurisdictionId: olive.id, metricDefId: defByKey.get("permit_portal")!.id, status: MetricValueStatus.MEASURED, valueNumeric: 0, notes: "Applications submitted to office.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.olivetownship.org/permits-fee-schedules", sourceTitle: "Permit Fee Schedule", sourcePublisher: "Olive Township" });
  }

  if (georgetown) {
    await upsertMetricValue({ jurisdictionId: georgetown.id, metricDefId: defByKey.get("required_permits_count")!.id, status: MetricValueStatus.MEASURED, valueNumeric: 7, notes: "Building via PCI + zoning + septic/well.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.gtwp.com/193/Forms", sourceTitle: "Georgetown Township Forms", sourcePublisher: "Georgetown Township" });
    await upsertMetricValue({ jurisdictionId: georgetown.id, metricDefId: defByKey.get("approval_gates_count")!.id, status: MetricValueStatus.MEASURED, valueNumeric: 4, notes: "Zoning, PCI, county health, road commission.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.gtwp.com/193/Forms", sourceTitle: "Georgetown Township Forms", sourcePublisher: "Georgetown Township" });
    await upsertMetricValue({ jurisdictionId: georgetown.id, metricDefId: defByKey.get("permit_cost_burden")!.id, status: MetricValueStatus.DERIVED, valueNumeric: 52, notes: "Zoning + septic + well, partial due PCI variable fees.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.gtwp.com/193/Forms", sourceTitle: "Georgetown Township Forms", sourcePublisher: "Georgetown Township" });
    await upsertMetricValue({ jurisdictionId: georgetown.id, metricDefId: defByKey.get("fee_schedule_online")!.id, status: MetricValueStatus.MEASURED, valueNumeric: 1, notes: "Zoning fee schedule is published.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.gtwp.com/193/Forms", sourceTitle: "Georgetown Township Forms", sourcePublisher: "Georgetown Township" });
    await upsertMetricValue({ jurisdictionId: georgetown.id, metricDefId: defByKey.get("permit_portal")!.id, status: MetricValueStatus.MEASURED, valueNumeric: 0, notes: "No direct online submission workflow.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://www.gtwp.com/193/Forms", sourceTitle: "Georgetown Township Forms", sourcePublisher: "Georgetown Township" });
  }

  const ottawa = bySlug.get("ottawa-county");
  if (ottawa) {
    const permitTypes = await prisma.permitType.findMany();
    const byPermit = new Map(permitTypes.map((p) => [p.slug, p.id]));

    const countyFees = [
      { permitTypeSlug: "septic", feeName: "Septic NEW (Private Single Family)", amount: 535 },
      { permitTypeSlug: "septic", feeName: "Septic & Well NEW (Private Single Family)", amount: 980 },
      { permitTypeSlug: "well", feeName: "Well NEW (Private Single Family)", amount: 445 },
      { permitTypeSlug: "soil_eval", feeName: "Vacant Land Evaluation / Perk Test", amount: 400 },
      { permitTypeSlug: "soil_eval", feeName: "Real Estate Transfer Evaluation", amount: 345 },
    ];

    for (const fee of countyFees) {
      const permitTypeId = byPermit.get(fee.permitTypeSlug);
      if (!permitTypeId) continue;
      await prisma.feeItem.upsert({
        where: {
          id: `${ottawa.id}-${permitTypeId}-${fee.feeName}`.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80),
        },
        create: {
          id: `${ottawa.id}-${permitTypeId}-${fee.feeName}`.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80),
          jurisdictionId: ottawa.id,
          permitTypeId,
          feeName: fee.feeName,
          amount: fee.amount,
          sourceUrl: "https://miottawa.org/fee-schedule",
          lastVerifiedDate: new Date("2026-02-14"),
        },
        update: {
          amount: fee.amount,
          sourceUrl: "https://miottawa.org/fee-schedule",
          lastVerifiedDate: new Date("2026-02-14"),
        },
      });
    }

    await upsertMetricValue({ jurisdictionId: ottawa.id, metricDefId: defByKey.get("county_health_permit_processing_days")!.id, status: MetricValueStatus.UNKNOWN, notes: "County process metric pending automated extraction.", lastVerified: new Date("2026-02-14") });
    await upsertMetricValue({ jurisdictionId: ottawa.id, metricDefId: defByKey.get("county_road_permit_processing_days")!.id, status: MetricValueStatus.UNKNOWN, notes: "Road permit timing pending.", lastVerified: new Date("2026-02-14") });
    await upsertMetricValue({ jurisdictionId: ottawa.id, metricDefId: defByKey.get("county_zoning_authority_present")!.id, status: MetricValueStatus.MEASURED, valueNumeric: 0, notes: "Zoning authority is municipality-level in target scope.", lastVerified: new Date("2026-02-14"), sourceUrl: "https://miottawa.org", sourceTitle: "Ottawa County", sourcePublisher: "Ottawa County" });
  }

  const michigan = bySlug.get("michigan");
  if (michigan) {
    for (const key of [
      "state_environmental_permit_processing_days",
      "state_business_filing_turnaround_days",
      "state_code_cycle_lag_months",
      "state_land_use_statute_amendments_10yr",
      "state_property_tax_burden_index",
    ]) {
      await upsertMetricValue({
        jurisdictionId: michigan.id,
        metricDefId: defByKey.get(key)!.id,
        status: MetricValueStatus.UNKNOWN,
        notes: "State-level automated collection target; pending source extraction.",
        lastVerified: new Date("2026-02-14"),
      });
    }
  }

  console.log("Seed complete: hierarchy, expanded metric catalog, and explicit metric statuses initialized.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
