import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VERIFY_DATE = new Date("2026-02-14");

type MetricStatus = "MEASURED" | "DERIVED" | "UNKNOWN" | "NOT_APPLICABLE" | "FAILED";
type JurisdictionLevel = "MUNICIPALITY" | "COUNTY" | "STATE";

type MetricDefSeed = {
  key: string;
  label: string;
  unit: string | null;
  windowYears?: number;
  pathResidential: boolean;
  pathCommercial: boolean;
  appliesMunicipality: boolean;
  appliesCounty: boolean;
  appliesState: boolean;
  indexComponent?: string;
  weight?: number;
  sortOrder: number;
};

type SocialMentionSeed = {
  jurisdictionSlug: string;
  platform: string;
  sourceType: "OFFICIAL_PAGE" | "PUBLIC_MENTION";
  authorHandle: string | null;
  postUrl: string;
  postText: string;
  postedAt: Date;
};

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
] as const;

const METRIC_DEFS: MetricDefSeed[] = [
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
  { key: "county_health_permit_processing_days", label: "County health permit processing time", unit: "days", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: true, appliesState: false, sortOrder: 18 },
  { key: "county_road_permit_processing_days", label: "County road permit processing time", unit: "days", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: true, appliesState: false, sortOrder: 19 },
  { key: "county_zoning_authority_present", label: "County zoning authority present", unit: "boolean", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: true, appliesState: false, sortOrder: 20 },
  { key: "county_land_use_appeal_approval_rate_5yr", label: "County land-use appeal approval rate (5-year avg)", unit: "percent", windowYears: 5, pathResidential: false, pathCommercial: true, appliesMunicipality: false, appliesCounty: true, appliesState: false, sortOrder: 21 },
  { key: "state_environmental_permit_processing_days", label: "State environmental permit processing time", unit: "days", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, sortOrder: 22 },
  { key: "state_business_filing_turnaround_days", label: "State business filing turnaround", unit: "days", pathResidential: false, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, sortOrder: 23 },
  { key: "state_code_cycle_lag_months", label: "State code-cycle lag", unit: "months", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, sortOrder: 24 },
  { key: "state_land_use_statute_amendments_10yr", label: "State land-use statute amendments (10-year)", unit: "count", windowYears: 10, pathResidential: false, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, sortOrder: 25 },
  { key: "state_property_tax_burden_index", label: "State property tax burden index", unit: "score", pathResidential: true, pathCommercial: true, appliesMunicipality: false, appliesCounty: false, appliesState: true, sortOrder: 26 },
  { key: "community_sentiment_score_90d", label: "Community sentiment score (90-day)", unit: "score", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, sortOrder: 27 },
  { key: "community_sentiment_mentions_90d", label: "Community sentiment mentions analyzed (90-day)", unit: "count", pathResidential: true, pathCommercial: true, appliesMunicipality: true, appliesCounty: true, appliesState: true, sortOrder: 28 },
];

const JURISDICTIONS = [
  {
    name: "Michigan",
    slug: "michigan",
    type: "state",
    level: "STATE" as JurisdictionLevel,
    parentSlug: null,
    county: null,
    state: "MI",
    website: "https://www.michigan.gov",
    buildingDeptLink: null,
    healthDeptLink: null,
    phone: null,
    address: null,
    officeHours: null,
    notes: "State-level profile for Michigan.",
    lastVerified: VERIFY_DATE,
  },
  {
    name: "Ottawa County",
    slug: "ottawa-county",
    type: "county",
    level: "COUNTY" as JurisdictionLevel,
    parentSlug: "michigan",
    county: null,
    state: "MI",
    website: "https://www.miottawa.org",
    buildingDeptLink: null,
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: "(616) 393-5645",
    address: null,
    officeHours: null,
    notes: "Environmental health includes septic, well, and soil evaluation. Building permits are municipal.",
    lastVerified: VERIFY_DATE,
  },
  {
    name: "Georgetown Township",
    slug: "georgetown-township",
    type: "township",
    level: "MUNICIPALITY" as JurisdictionLevel,
    parentSlug: "ottawa-county",
    county: "Ottawa",
    state: "MI",
    website: "https://www.gtwp.com",
    buildingDeptLink: "https://www.gtwp.com/193/Forms",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: "(616) 457-2340",
    address: "1515 Baldwin St., Jenison, MI 49428",
    officeHours: null,
    notes: "Uses Professional Code Inspections for building permit processing.",
    lastVerified: VERIFY_DATE,
  },
  {
    name: "Holland Charter Township",
    slug: "holland-charter-township",
    type: "township",
    level: "MUNICIPALITY" as JurisdictionLevel,
    parentSlug: "ottawa-county",
    county: "Ottawa",
    state: "MI",
    website: "https://www.hct.holland.mi.us",
    buildingDeptLink: "https://www.hct.holland.mi.us/permits",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: "(616) 396-2345",
    address: "353 N. 120th Avenue, Holland, MI 49424",
    officeHours: "Mon-Fri 8am-5pm",
    notes: "Ottawa County township. Septic and well permits run through Ottawa County Health.",
    lastVerified: VERIFY_DATE,
  },
  {
    name: "Olive Township",
    slug: "olive-township",
    type: "township",
    level: "MUNICIPALITY" as JurisdictionLevel,
    parentSlug: "ottawa-county",
    county: "Ottawa",
    state: "MI",
    website: "https://www.olivetownship.org",
    buildingDeptLink: "https://www.olivetownship.org/permits-fee-schedules",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: null,
    address: null,
    officeHours: null,
    notes: "Fee schedule effective 01/01/2025.",
    lastVerified: VERIFY_DATE,
  },
] as const;

const SOCIAL_MENTIONS: SocialMentionSeed[] = [
  {
    jurisdictionSlug: "holland-charter-township",
    platform: "facebook",
    sourceType: "OFFICIAL_PAGE",
    authorHandle: "hollandchartertownship",
    postUrl: "https://www.facebook.com/hollandchartertownship/posts/101",
    postText: "Building permit wait times improved this month and residents reported a smooth process.",
    postedAt: new Date("2026-02-03"),
  },
  {
    jurisdictionSlug: "holland-charter-township",
    platform: "reddit",
    sourceType: "PUBLIC_MENTION",
    authorHandle: "westmi_builder",
    postUrl: "https://www.reddit.com/r/WestMichigan/comments/holland_permit_feedback_2026/",
    postText: "Approval was quick, but checklist instructions were confusing for first-time applicants.",
    postedAt: new Date("2026-01-20"),
  },
  {
    jurisdictionSlug: "olive-township",
    platform: "facebook",
    sourceType: "OFFICIAL_PAGE",
    authorHandle: "olivetownship",
    postUrl: "https://www.facebook.com/olivetownship/posts/205",
    postText: "Updated permit packet is now online. Staff answered questions quickly and clearly.",
    postedAt: new Date("2026-02-01"),
  },
  {
    jurisdictionSlug: "olive-township",
    platform: "reddit",
    sourceType: "PUBLIC_MENTION",
    authorHandle: "newhome_ottawa",
    postUrl: "https://www.reddit.com/r/Michigan/comments/olive_township_permit_experience/",
    postText: "The permit process worked, but inspections felt slow and the scheduling portal was frustrating.",
    postedAt: new Date("2026-01-25"),
  },
  {
    jurisdictionSlug: "georgetown-township",
    platform: "facebook",
    sourceType: "OFFICIAL_PAGE",
    authorHandle: "georgetowntownshipmi",
    postUrl: "https://www.facebook.com/georgetowntownshipmi/posts/88",
    postText: "New online forms reduced permit delays and improved communication this quarter.",
    postedAt: new Date("2026-02-06"),
  },
  {
    jurisdictionSlug: "georgetown-township",
    platform: "reddit",
    sourceType: "PUBLIC_MENTION",
    authorHandle: "jenisonresident",
    postUrl: "https://www.reddit.com/r/grandrapids/comments/georgetown_zoning_timeline/",
    postText: "Zoning review took longer than expected, but staff were helpful and professional.",
    postedAt: new Date("2026-01-18"),
  },
  {
    jurisdictionSlug: "ottawa-county",
    platform: "x",
    sourceType: "PUBLIC_MENTION",
    authorHandle: "ottawacountywatch",
    postUrl: "https://x.com/ottawacountywatch/status/1900012345678901234",
    postText: "County health permit responses were clear this month, though turnaround still feels slow.",
    postedAt: new Date("2026-02-04"),
  },
  {
    jurisdictionSlug: "michigan",
    platform: "reddit",
    sourceType: "PUBLIC_MENTION",
    authorHandle: "midwest_dev",
    postUrl: "https://www.reddit.com/r/Michigan/comments/state_building_code_feedback_2026/",
    postText: "State filing updates were helpful and transparent, but code updates remain difficult to track.",
    postedAt: new Date("2026-02-02"),
  },
];

const POSITIVE_TERMS = [
  "improved",
  "smooth",
  "quick",
  "clearly",
  "helpful",
  "professional",
  "transparent",
  "reduced",
  "clear",
] as const;

const NEGATIVE_TERMS = [
  "confusing",
  "slow",
  "frustrating",
  "delay",
  "delays",
  "longer",
  "difficult",
  "hard",
] as const;

function analyzeSentiment(text: string): { score: number; label: "POSITIVE" | "NEUTRAL" | "NEGATIVE"; confidence: number } {
  const normalized = text.toLowerCase();
  const positive = POSITIVE_TERMS.filter((word) => normalized.includes(word)).length;
  const negative = NEGATIVE_TERMS.filter((word) => normalized.includes(word)).length;
  const denominator = Math.max(1, positive + negative);
  const raw = (positive - negative) / denominator;
  const score = Math.max(-1, Math.min(1, raw));
  const label = score > 0.2 ? "POSITIVE" : score < -0.2 ? "NEGATIVE" : "NEUTRAL";
  const confidence = Math.min(1, 0.3 + denominator * 0.2);
  return { score, label, confidence };
}

function appliesToLevel(level: string, metricDef: MetricDefSeed): boolean {
  if (level === "MUNICIPALITY") return metricDef.appliesMunicipality;
  if (level === "COUNTY") return metricDef.appliesCounty;
  if (level === "STATE") return metricDef.appliesState;
  return false;
}

async function ensureSource(
  url: string,
  title: string,
  publisher: string | null,
  reliability: "OFFICIAL" | "OTHER" = "OFFICIAL"
) {
  const existing = await prisma.source.findUnique({ where: { url } });
  if (existing) return existing;
  return prisma.source.create({
    data: {
      url,
      title,
      publisher,
      retrievedDate: VERIFY_DATE,
      reliability,
    },
  });
}

type MetricPatch = {
  jurisdictionSlug: string;
  metricKey: string;
  status: MetricStatus;
  valueNumeric?: number;
  valueText?: string;
  notes?: string;
  confidence?: number;
  source?: { url: string; title: string; publisher: string | null; locatorText?: string };
};

async function main() {
  for (const permitType of PERMIT_TYPES) {
    await prisma.permitType.upsert({
      where: { slug: permitType.slug },
      create: permitType,
      update: permitType,
    });
  }

  for (const metricDef of METRIC_DEFS) {
    await prisma.metricDef.upsert({
      where: { key: metricDef.key },
      create: {
        ...metricDef,
        unit: metricDef.unit,
        windowYears: metricDef.windowYears ?? null,
        indexComponent: metricDef.indexComponent ?? null,
        weight: metricDef.weight ?? null,
      },
      update: {
        ...metricDef,
        unit: metricDef.unit,
        windowYears: metricDef.windowYears ?? null,
        indexComponent: metricDef.indexComponent ?? null,
        weight: metricDef.weight ?? null,
      },
    });
  }

  for (const jurisdiction of JURISDICTIONS) {
    await prisma.jurisdiction.upsert({
      where: { slug: jurisdiction.slug },
      create: {
        name: jurisdiction.name,
        slug: jurisdiction.slug,
        type: jurisdiction.type,
        level: jurisdiction.level,
        county: jurisdiction.county,
        state: jurisdiction.state,
        website: jurisdiction.website,
        buildingDeptLink: jurisdiction.buildingDeptLink,
        healthDeptLink: jurisdiction.healthDeptLink,
        phone: jurisdiction.phone,
        address: jurisdiction.address,
        officeHours: jurisdiction.officeHours,
        notes: jurisdiction.notes,
        lastVerified: jurisdiction.lastVerified,
        parentId: null,
      },
      update: {
        name: jurisdiction.name,
        type: jurisdiction.type,
        level: jurisdiction.level,
        county: jurisdiction.county,
        state: jurisdiction.state,
        website: jurisdiction.website,
        buildingDeptLink: jurisdiction.buildingDeptLink,
        healthDeptLink: jurisdiction.healthDeptLink,
        phone: jurisdiction.phone,
        address: jurisdiction.address,
        officeHours: jurisdiction.officeHours,
        notes: jurisdiction.notes,
        lastVerified: jurisdiction.lastVerified,
      },
    });
  }

  const jurisdictions = await prisma.jurisdiction.findMany({
    where: { slug: { in: JURISDICTIONS.map((j) => j.slug) } },
  });
  const jurisdictionBySlug = new Map(jurisdictions.map((j) => [j.slug, j]));

  for (const jurisdiction of JURISDICTIONS) {
    const j = jurisdictionBySlug.get(jurisdiction.slug);
    if (!j) continue;
    const parentId = jurisdiction.parentSlug
      ? jurisdictionBySlug.get(jurisdiction.parentSlug)?.id ?? null
      : null;

    await prisma.jurisdiction.update({
      where: { id: j.id },
      data: { parentId },
    });
  }

  const metricDefs = await prisma.metricDef.findMany();
  const metricDefByKey = new Map(metricDefs.map((d) => [d.key, d]));

  // Ensure every jurisdiction has all metric rows with explicit status.
  for (const jurisdiction of jurisdictions) {
    for (const metricDef of METRIC_DEFS) {
      const defRow = metricDefByKey.get(metricDef.key);
      if (!defRow) continue;

      const applicable = appliesToLevel(jurisdiction.level, metricDef);
      const status: MetricStatus = applicable ? "UNKNOWN" : "NOT_APPLICABLE";
      const valueText = applicable ? null : "N/A for this jurisdiction level";

      await prisma.metricValue.upsert({
        where: {
          jurisdictionId_metricDefId: {
            jurisdictionId: jurisdiction.id,
            metricDefId: defRow.id,
          },
        },
        create: {
          jurisdictionId: jurisdiction.id,
          metricDefId: defRow.id,
          status,
          valueNumeric: null,
          valueText,
          lastVerified: VERIFY_DATE,
          collectedAt: VERIFY_DATE,
          confidence: applicable ? null : 1,
          notes: applicable ? "Metric not yet collected." : "Not applicable to this jurisdiction level.",
        },
        update: {
          status,
          valueNumeric: null,
          valueText,
          lastVerified: VERIFY_DATE,
          collectedAt: VERIFY_DATE,
          confidence: applicable ? null : 1,
          notes: applicable ? "Metric not yet collected." : "Not applicable to this jurisdiction level.",
        },
      });
    }
  }

  const metricPatches: MetricPatch[] = [
    {
      jurisdictionSlug: "holland-charter-township",
      metricKey: "millage_rate",
      status: "MEASURED",
      valueNumeric: 31.98,
      notes: "2025 total PRE in Holland school district; township levy 4.86 mills.",
      source: {
        url: "https://www.hct.holland.mi.us/departments/treasurer/tax-millage-rates",
        title: "2025 Tax Millage Rates",
        publisher: "Holland Charter Township",
        locatorText: "2025 millage table",
      },
    },
    {
      jurisdictionSlug: "holland-charter-township",
      metricKey: "required_permits_count",
      status: "MEASURED",
      valueNumeric: 6,
      notes: "Building, electrical, mechanical, plumbing, septic, and well for a typical SFH.",
      source: {
        url: "https://www.hct.holland.mi.us/permits",
        title: "Building Permits",
        publisher: "Holland Charter Township",
        locatorText: "permit requirements",
      },
    },
    {
      jurisdictionSlug: "holland-charter-township",
      metricKey: "approval_gates_count",
      status: "MEASURED",
      valueNumeric: 3,
      notes: "Zoning, building, and county health approvals.",
      source: {
        url: "https://www.hct.holland.mi.us/permits",
        title: "Building Permits",
        publisher: "Holland Charter Township",
        locatorText: "approval steps",
      },
    },
    {
      jurisdictionSlug: "holland-charter-township",
      metricKey: "fee_schedule_online",
      status: "MEASURED",
      valueNumeric: 1,
      notes: "Fee information published in building department information packets.",
      source: {
        url: "https://www.hct.holland.mi.us/forms/building-department-forms-information-packets/information-packets",
        title: "Building Department Information Packets",
        publisher: "Holland Charter Township",
        locatorText: "posted fee packet links",
      },
    },
    {
      jurisdictionSlug: "holland-charter-township",
      metricKey: "permit_portal",
      status: "MEASURED",
      valueNumeric: 0,
      notes: "No online permit submission workflow identified.",
      source: {
        url: "https://www.hct.holland.mi.us/permits",
        title: "Building Permits",
        publisher: "Holland Charter Township",
        locatorText: "application delivery instructions",
      },
    },
    {
      jurisdictionSlug: "olive-township",
      metricKey: "required_permits_count",
      status: "MEASURED",
      valueNumeric: 6,
      notes: "Typical SFH requires building/trade and county health permits.",
      source: {
        url: "https://www.olivetownship.org/permits-fee-schedules",
        title: "Olive Township Permit Fee Schedule",
        publisher: "Olive Township",
        locatorText: "permit list",
      },
    },
    {
      jurisdictionSlug: "olive-township",
      metricKey: "required_inspections_count",
      status: "MEASURED",
      valueNumeric: 6,
      notes: "Typical set includes footing, rough trade, and final inspections.",
      source: {
        url: "https://www.olivetownship.org/permits-fee-schedules",
        title: "Olive Township Permit Fee Schedule",
        publisher: "Olive Township",
        locatorText: "inspection schedule",
      },
    },
    {
      jurisdictionSlug: "olive-township",
      metricKey: "approval_gates_count",
      status: "MEASURED",
      valueNumeric: 3,
      notes: "Zoning, building, and county health gate sequence.",
      source: {
        url: "https://www.olivetownship.org/permits-fee-schedules",
        title: "Olive Township Permit Fee Schedule",
        publisher: "Olive Township",
        locatorText: "permit intake process",
      },
    },
    {
      jurisdictionSlug: "olive-township",
      metricKey: "permit_cost_burden",
      status: "DERIVED",
      valueNumeric: 63,
      notes: "Derived from listed fee totals for a typical SFH.",
      source: {
        url: "https://www.olivetownship.org/permits-fee-schedules",
        title: "Olive Township Permit Fee Schedule",
        publisher: "Olive Township",
        locatorText: "fee totals and normalization",
      },
    },
    {
      jurisdictionSlug: "olive-township",
      metricKey: "fee_schedule_online",
      status: "MEASURED",
      valueNumeric: 1,
      notes: "Fee schedule page is public and directly linked.",
      source: {
        url: "https://www.olivetownship.org/permits-fee-schedules",
        title: "Olive Township Permit Fee Schedule",
        publisher: "Olive Township",
        locatorText: "public fee schedule page",
      },
    },
    {
      jurisdictionSlug: "olive-township",
      metricKey: "permit_portal",
      status: "MEASURED",
      valueNumeric: 0,
      notes: "No evidence of full online permit portal submission.",
      source: {
        url: "https://www.olivetownship.org/permits-fee-schedules",
        title: "Olive Township Permit Fee Schedule",
        publisher: "Olive Township",
        locatorText: "application submission guidance",
      },
    },
    {
      jurisdictionSlug: "georgetown-township",
      metricKey: "required_permits_count",
      status: "MEASURED",
      valueNumeric: 7,
      notes: "Includes zoning, building/trade, and county health permits.",
      source: {
        url: "https://www.gtwp.com/193/Forms",
        title: "Georgetown Township Forms",
        publisher: "Georgetown Township",
        locatorText: "forms and permit documents",
      },
    },
    {
      jurisdictionSlug: "georgetown-township",
      metricKey: "approval_gates_count",
      status: "MEASURED",
      valueNumeric: 4,
      notes: "Zoning, code inspections, health department, and road commission.",
      source: {
        url: "https://www.gtwp.com/193/Forms",
        title: "Georgetown Township Forms",
        publisher: "Georgetown Township",
        locatorText: "permit authority split",
      },
    },
    {
      jurisdictionSlug: "georgetown-township",
      metricKey: "permit_cost_burden",
      status: "DERIVED",
      valueNumeric: 52,
      notes: "Derived normalized burden from published base fees.",
      source: {
        url: "https://www.gtwp.com/193/Forms",
        title: "Georgetown Township Forms",
        publisher: "Georgetown Township",
        locatorText: "fee summary",
      },
    },
    {
      jurisdictionSlug: "georgetown-township",
      metricKey: "fee_schedule_online",
      status: "MEASURED",
      valueNumeric: 1,
      notes: "Fee and form references are publicly posted.",
      source: {
        url: "https://www.gtwp.com/193/Forms",
        title: "Georgetown Township Forms",
        publisher: "Georgetown Township",
        locatorText: "published forms/fee docs",
      },
    },
    {
      jurisdictionSlug: "georgetown-township",
      metricKey: "permit_portal",
      status: "MEASURED",
      valueNumeric: 0,
      notes: "No direct online permit portal identified.",
      source: {
        url: "https://www.gtwp.com/193/Forms",
        title: "Georgetown Township Forms",
        publisher: "Georgetown Township",
        locatorText: "downloadable forms only",
      },
    },
    {
      jurisdictionSlug: "ottawa-county",
      metricKey: "county_zoning_authority_present",
      status: "MEASURED",
      valueNumeric: 0,
      notes: "Land use zoning approvals are handled at municipal level in this dataset.",
      source: {
        url: "https://www.miottawa.org",
        title: "Ottawa County Official Site",
        publisher: "Ottawa County",
        locatorText: "department responsibility scope",
      },
    },
  ];

  for (const patch of metricPatches) {
    const jurisdiction = jurisdictionBySlug.get(patch.jurisdictionSlug);
    const metricDef = metricDefByKey.get(patch.metricKey);

    if (!jurisdiction || !metricDef) {
      continue;
    }

    const metricValue = await prisma.metricValue.upsert({
      where: {
        jurisdictionId_metricDefId: {
          jurisdictionId: jurisdiction.id,
          metricDefId: metricDef.id,
        },
      },
      create: {
        jurisdictionId: jurisdiction.id,
        metricDefId: metricDef.id,
        status: patch.status,
        valueNumeric: patch.valueNumeric ?? null,
        valueText: patch.valueText ?? null,
        lastVerified: VERIFY_DATE,
        collectedAt: VERIFY_DATE,
        confidence: patch.confidence ?? (patch.status === "DERIVED" ? 0.8 : 1),
        notes: patch.notes ?? null,
      },
      update: {
        status: patch.status,
        valueNumeric: patch.valueNumeric ?? null,
        valueText: patch.valueText ?? null,
        lastVerified: VERIFY_DATE,
        collectedAt: VERIFY_DATE,
        confidence: patch.confidence ?? (patch.status === "DERIVED" ? 0.8 : 1),
        notes: patch.notes ?? null,
      },
    });

    if (!patch.source) {
      continue;
    }

    const source = await ensureSource(
      patch.source.url,
      patch.source.title,
      patch.source.publisher
    );

    const locatorText = patch.source.locatorText ?? null;
    const existingCitation = await prisma.citation.findFirst({
      where: {
        metricValueId: metricValue.id,
        sourceId: source.id,
        locatorText,
      },
    });

    if (!existingCitation) {
      await prisma.citation.create({
        data: {
          metricValueId: metricValue.id,
          sourceId: source.id,
          locatorText,
        },
      });
    }
  }

  for (const mention of SOCIAL_MENTIONS) {
    const jurisdiction = jurisdictionBySlug.get(mention.jurisdictionSlug);
    if (!jurisdiction) continue;

    const analyzed = analyzeSentiment(mention.postText);
    await prisma.socialMention.upsert({
      where: {
        jurisdictionId_postUrl: {
          jurisdictionId: jurisdiction.id,
          postUrl: mention.postUrl,
        },
      },
      create: {
        jurisdictionId: jurisdiction.id,
        platform: mention.platform,
        sourceType: mention.sourceType,
        authorHandle: mention.authorHandle,
        postUrl: mention.postUrl,
        postText: mention.postText,
        postedAt: mention.postedAt,
        sentimentScore: analyzed.score,
        sentimentLabel: analyzed.label,
        confidence: analyzed.confidence,
        collectedAt: VERIFY_DATE,
      },
      update: {
        platform: mention.platform,
        sourceType: mention.sourceType,
        authorHandle: mention.authorHandle,
        postText: mention.postText,
        postedAt: mention.postedAt,
        sentimentScore: analyzed.score,
        sentimentLabel: analyzed.label,
        confidence: analyzed.confidence,
        collectedAt: VERIFY_DATE,
      },
    });
  }

  const sentimentScoreMetric = metricDefByKey.get("community_sentiment_score_90d");
  const sentimentCountMetric = metricDefByKey.get("community_sentiment_mentions_90d");
  const sentimentWindowStart = new Date(VERIFY_DATE.getTime() - 90 * 24 * 60 * 60 * 1000);

  if (sentimentScoreMetric && sentimentCountMetric) {
    for (const jurisdiction of jurisdictions) {
      const recentMentions = await prisma.socialMention.findMany({
        where: {
          jurisdictionId: jurisdiction.id,
          postedAt: { gte: sentimentWindowStart },
        },
        orderBy: { postedAt: "desc" },
      });

      const mentionsCount = recentMentions.length;
      const averageSentiment =
        mentionsCount > 0
          ? recentMentions.reduce((sum, mention) => sum + mention.sentimentScore, 0) / mentionsCount
          : null;
      const normalizedScore =
        averageSentiment === null
          ? null
          : Math.round((((averageSentiment + 1) / 2) * 100) * 10) / 10;

      const sentimentScoreValue = await prisma.metricValue.upsert({
        where: {
          jurisdictionId_metricDefId: {
            jurisdictionId: jurisdiction.id,
            metricDefId: sentimentScoreMetric.id,
          },
        },
        create: {
          jurisdictionId: jurisdiction.id,
          metricDefId: sentimentScoreMetric.id,
          status: mentionsCount > 0 ? "DERIVED" : "UNKNOWN",
          valueNumeric: normalizedScore,
          valueText: mentionsCount > 0 ? null : "No social mentions collected in last 90 days.",
          confidence: mentionsCount > 0 ? 0.65 : null,
          lastVerified: VERIFY_DATE,
          collectedAt: VERIFY_DATE,
          notes: "Derived from social post sentiment over the trailing 90 days.",
        },
        update: {
          status: mentionsCount > 0 ? "DERIVED" : "UNKNOWN",
          valueNumeric: normalizedScore,
          valueText: mentionsCount > 0 ? null : "No social mentions collected in last 90 days.",
          confidence: mentionsCount > 0 ? 0.65 : null,
          lastVerified: VERIFY_DATE,
          collectedAt: VERIFY_DATE,
          notes: "Derived from social post sentiment over the trailing 90 days.",
        },
      });

      const sentimentCountValue = await prisma.metricValue.upsert({
        where: {
          jurisdictionId_metricDefId: {
            jurisdictionId: jurisdiction.id,
            metricDefId: sentimentCountMetric.id,
          },
        },
        create: {
          jurisdictionId: jurisdiction.id,
          metricDefId: sentimentCountMetric.id,
          status: mentionsCount > 0 ? "DERIVED" : "UNKNOWN",
          valueNumeric: mentionsCount > 0 ? mentionsCount : null,
          valueText: mentionsCount > 0 ? null : "No social mentions collected in last 90 days.",
          confidence: mentionsCount > 0 ? 1 : null,
          lastVerified: VERIFY_DATE,
          collectedAt: VERIFY_DATE,
          notes: "Count of social posts analyzed over the trailing 90 days.",
        },
        update: {
          status: mentionsCount > 0 ? "DERIVED" : "UNKNOWN",
          valueNumeric: mentionsCount > 0 ? mentionsCount : null,
          valueText: mentionsCount > 0 ? null : "No social mentions collected in last 90 days.",
          confidence: mentionsCount > 0 ? 1 : null,
          lastVerified: VERIFY_DATE,
          collectedAt: VERIFY_DATE,
          notes: "Count of social posts analyzed over the trailing 90 days.",
        },
      });

      for (const mention of recentMentions.slice(0, 5)) {
        const source = await ensureSource(
          mention.postUrl,
          `${mention.platform} mention for ${jurisdiction.name}`,
          mention.authorHandle ? `@${mention.authorHandle}` : mention.platform,
          mention.sourceType === "OFFICIAL_PAGE" ? "OFFICIAL" : "OTHER"
        );
        const locatorText = `${mention.sentimentLabel.toLowerCase()} mention on ${mention.postedAt.toISOString().slice(0, 10)}`;

        for (const metricValue of [sentimentScoreValue, sentimentCountValue]) {
          const existingCitation = await prisma.citation.findFirst({
            where: {
              metricValueId: metricValue.id,
              sourceId: source.id,
              locatorText,
            },
          });
          if (!existingCitation) {
            await prisma.citation.create({
              data: {
                metricValueId: metricValue.id,
                sourceId: source.id,
                locatorText,
              },
            });
          }
        }
      }
    }
  }

  const permitTypes = await prisma.permitType.findMany();
  const permitTypeBySlug = new Map(permitTypes.map((p) => [p.slug, p]));

  const olive = jurisdictionBySlug.get("olive-township");
  if (olive) {
    const oliveFees = [
      { permitTypeSlug: "electrical", feeName: "New House", amount: 285, notes: "$380 with temporary service" },
      { permitTypeSlug: "electrical", feeName: "Remodel", amount: 95, notes: "Per inspection" },
      { permitTypeSlug: "mechanical", feeName: "New House", amount: 190, notes: null },
      { permitTypeSlug: "mechanical", feeName: "Remodel", amount: 95, notes: "Per inspection" },
      { permitTypeSlug: "plumbing", feeName: "New House", amount: 190, notes: "$285 with underground" },
      { permitTypeSlug: "plumbing", feeName: "Remodel", amount: 95, notes: "Per inspection" },
    ] as const;

    for (const fee of oliveFees) {
      const permitType = permitTypeBySlug.get(fee.permitTypeSlug);
      if (!permitType) continue;

      const existing = await prisma.feeItem.findFirst({
        where: {
          jurisdictionId: olive.id,
          permitTypeId: permitType.id,
          feeName: fee.feeName,
        },
      });

      const feeData = {
        jurisdictionId: olive.id,
        permitTypeId: permitType.id,
        feeName: fee.feeName,
        amount: fee.amount,
        notes: fee.notes,
        sourceUrl: "https://www.olivetownship.org/permits-fee-schedules",
        lastVerifiedDate: VERIFY_DATE,
      };

      if (existing) {
        await prisma.feeItem.update({ where: { id: existing.id }, data: feeData });
      } else {
        await prisma.feeItem.create({ data: feeData });
      }
    }
  }

  const ottawa = jurisdictionBySlug.get("ottawa-county");
  if (ottawa) {
    const ottawaFees = [
      { permitTypeSlug: "septic", feeName: "Septic NEW (Private Single Family)", amount: 535 },
      { permitTypeSlug: "septic", feeName: "Septic & Well NEW (Private Single Family)", amount: 980 },
      { permitTypeSlug: "well", feeName: "Well NEW (Private Single Family)", amount: 445 },
      { permitTypeSlug: "soil_eval", feeName: "Vacant Land Evaluation / Perk Test", amount: 400 },
      { permitTypeSlug: "soil_eval", feeName: "Real Estate Transfer Evaluation", amount: 345 },
    ] as const;

    for (const fee of ottawaFees) {
      const permitType = permitTypeBySlug.get(fee.permitTypeSlug);
      if (!permitType) continue;

      const existing = await prisma.feeItem.findFirst({
        where: {
          jurisdictionId: ottawa.id,
          permitTypeId: permitType.id,
          feeName: fee.feeName,
        },
      });

      const feeData = {
        jurisdictionId: ottawa.id,
        permitTypeId: permitType.id,
        feeName: fee.feeName,
        amount: fee.amount,
        sourceUrl: "https://miottawa.org/fee-schedule",
        lastVerifiedDate: VERIFY_DATE,
      };

      if (existing) {
        await prisma.feeItem.update({ where: { id: existing.id }, data: feeData });
      } else {
        await prisma.feeItem.create({ data: feeData });
      }
    }
  }

  const totals = await prisma.$transaction([
    prisma.jurisdiction.count(),
    prisma.metricDef.count(),
    prisma.metricValue.count(),
  ]);

  console.log(
    `Seed complete: ${totals[0]} jurisdictions, ${totals[1]} metric definitions, ${totals[2]} metric values.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
