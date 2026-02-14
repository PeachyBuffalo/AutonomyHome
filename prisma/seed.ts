import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

const METRIC_DEFS = [
  { key: "variance_approval_rate_5yr", label: "Variance approval rate (5-year avg)", unit: "percent", windowYears: 5, pathResidential: true, pathCommercial: true, indexComponent: "predictability", weight: 0.25, sortOrder: 1 },
  { key: "rezoning_approval_rate", label: "Rezoning applications approved", unit: "percent", pathResidential: false, pathCommercial: true, indexComponent: "predictability", weight: 0.25, sortOrder: 2 },
  { key: "avg_permit_processing_days", label: "Average permit processing time", unit: "days", pathResidential: true, pathCommercial: true, indexComponent: "regulatory_intensity", weight: 0.15, sortOrder: 3 },
  { key: "millage_rate", label: "Millage rate", unit: "mills", pathResidential: true, pathCommercial: true, indexComponent: "fiscal_burden", weight: 0.5, sortOrder: 4 },
  { key: "zoning_amendments_10yr", label: "Zoning amendments (10-year)", unit: "count", windowYears: 10, pathResidential: false, pathCommercial: true, indexComponent: "predictability", weight: 0.2, sortOrder: 5 },
  { key: "zoning_litigation_10yr", label: "Zoning-related litigation (10-year)", unit: "count", windowYears: 10, pathResidential: false, pathCommercial: true, indexComponent: "predictability", weight: 0.2, sortOrder: 6 },
  { key: "required_permits_count", label: "Required permits (typical SFH)", unit: "count", pathResidential: true, pathCommercial: false, indexComponent: "regulatory_intensity", weight: 0.15, sortOrder: 7 },
  { key: "required_inspections_count", label: "Required inspections", unit: "count", pathResidential: true, pathCommercial: false, indexComponent: "regulatory_intensity", weight: 0.15, sortOrder: 8 },
  { key: "approval_gates_count", label: "Approval gates", unit: "count", pathResidential: true, pathCommercial: true, indexComponent: "regulatory_intensity", weight: 0.2, sortOrder: 9 },
  { key: "permit_cost_burden", label: "Permit cost burden (normalized 0-100)", unit: "score", pathResidential: true, pathCommercial: false, indexComponent: "regulatory_intensity", weight: 0.2, sortOrder: 10 },
  { key: "fee_schedule_online", label: "Fee schedule published online", unit: "boolean", pathResidential: true, pathCommercial: true, indexComponent: "transparency", weight: 0.2, sortOrder: 11 },
  { key: "zoning_map_online", label: "Zoning map available online", unit: "boolean", pathResidential: true, pathCommercial: true, indexComponent: "transparency", weight: 0.2, sortOrder: 12 },
  { key: "minutes_searchable", label: "Meeting minutes searchable", unit: "boolean", pathResidential: true, pathCommercial: true, indexComponent: "transparency", weight: 0.2, sortOrder: 13 },
  { key: "permit_portal", label: "Permit application portal", unit: "boolean", pathResidential: true, pathCommercial: true, indexComponent: "transparency", weight: 0.2, sortOrder: 14 },
  { key: "clear_checklists", label: "Clear permit checklists", unit: "boolean", pathResidential: true, pathCommercial: true, indexComponent: "transparency", weight: 0.2, sortOrder: 15 },
  { key: "special_assessments_present", label: "Special assessments present", unit: "boolean", pathResidential: true, pathCommercial: true, indexComponent: "fiscal_burden", weight: 0.25, sortOrder: 16 },
  { key: "debt_per_capita", label: "Debt per capita", unit: "dollars", pathResidential: true, pathCommercial: true, indexComponent: "fiscal_burden", weight: 0.25, sortOrder: 17 },
];

const JURISDICTIONS = [
  {
    name: "Holland Charter Township",
    slug: "holland-charter-township",
    type: "township" as const,
    county: "Ottawa",
    state: "MI",
    website: "https://www.hollandtownship.org",
    buildingDeptLink: "https://www.hollandtownship.org/building",
    healthDeptLink: null,
    phone: null,
    address: null,
    officeHours: null,
    notes: "Ottawa County township.",
    lastVerified: new Date("2024-11-15"),
  },
  {
    name: "Olive Township",
    slug: "olive-township",
    type: "township" as const,
    county: "Ottawa",
    state: "MI",
    website: "https://www.olivetownship.org",
    buildingDeptLink: "https://www.olivetownship.org/permits-fee-schedules",
    healthDeptLink: null,
    phone: null,
    address: null,
    officeHours: null,
    notes: "Ottawa County township. Fee schedules published.",
    lastVerified: new Date("2024-10-01"),
  },
  {
    name: "Georgetown Township",
    slug: "georgetown-township",
    type: "township" as const,
    county: "Ottawa",
    state: "MI",
    website: "https://www.georgetown-mi.org",
    buildingDeptLink: "https://www.georgetown-mi.org/building",
    healthDeptLink: null,
    phone: null,
    address: null,
    officeHours: null,
    notes: "Ottawa County township.",
    lastVerified: new Date("2024-09-20"),
  },
];

async function main() {
  for (const pt of PERMIT_TYPES) {
    await prisma.permitType.upsert({
      where: { slug: pt.slug },
      create: pt,
      update: pt,
    });
  }

  for (const md of METRIC_DEFS) {
    await prisma.metricDef.upsert({
      where: { key: md.key },
      create: md,
      update: md,
    });
  }

  for (const j of JURISDICTIONS) {
    await prisma.jurisdiction.upsert({
      where: { slug: j.slug },
      create: j,
      update: j,
    });
  }

  const metricDefs = await prisma.metricDef.findMany();
  const getDef = (key: string) => metricDefs.find((d) => d.key === key)!;

  // Holland Charter Township - example values from spec
  const holland = await prisma.jurisdiction.findUnique({
    where: { slug: "holland-charter-township" },
  });
  if (holland) {
    const sources: { url: string; title: string; publisher: string | null }[] = [
      { url: "https://www.hollandtownship.org/board/minutes", title: "Township Board Minutes 2019-2024", publisher: "Holland Charter Township" },
      { url: "https://www.hollandtownship.org/zoning", title: "Zoning Ordinance", publisher: "Holland Charter Township" },
      { url: "https://www.hollandtownship.org/building", title: "Building Department Fee Schedule", publisher: "Holland Charter Township" },
      { url: "https://www.miottawa.org/Equalization/taxrates.htm", title: "Ottawa County Tax Rates", publisher: "Ottawa County" },
      { url: "https://www.hollandtownship.org/planning", title: "Planning Commission Records", publisher: "Holland Charter Township" },
      { url: "https://www.courts.michigan.gov", title: "Michigan Court Records", publisher: "State of Michigan" },
    ];

    const createSource = async (url: string, title: string, publisher: string | null) => {
      const existing = await prisma.source.findUnique({ where: { url } });
      if (existing) return existing;
      return prisma.source.create({
        data: { url, title, publisher, retrievedDate: new Date() },
      });
    };

    const s1 = await createSource("https://www.hollandtownship.org/board/minutes", "Township Board Minutes 2019-2024", "Holland Charter Township");
    const s2 = await createSource("https://www.hollandtownship.org/zoning", "Zoning Ordinance", "Holland Charter Township");
    const s3 = await createSource("https://www.hollandtownship.org/building", "Building Department Fee Schedule", "Holland Charter Township");
    const s4 = await createSource("https://www.miottawa.org/Equalization/taxrates.htm", "Ottawa County Tax Rates", "Ottawa County");
    const s5 = await createSource("https://www.hollandtownship.org/planning", "Planning Commission Records", "Holland Charter Township");
    const s6 = await createSource("https://www.courts.michigan.gov", "Michigan Court Records", "State of Michigan");

    const metricValues = [
      { key: "variance_approval_rate_5yr", valueNumeric: 82, unit: "percent", lastVerified: new Date("2024-11-15"), notes: "5-year average" },
      { key: "rezoning_approval_rate", valueNumeric: 74, unit: "percent", lastVerified: new Date("2024-11-15") },
      { key: "avg_permit_processing_days", valueNumeric: 37, unit: "days", lastVerified: new Date("2024-11-15") },
      { key: "millage_rate", valueNumeric: 42.5, unit: "mills", lastVerified: new Date("2024-11-15"), notes: "Combined township + county + school" },
      { key: "zoning_amendments_10yr", valueNumeric: 19, unit: "count", lastVerified: new Date("2024-11-15") },
      { key: "zoning_litigation_10yr", valueNumeric: 3, unit: "count", lastVerified: new Date("2024-11-15") },
      { key: "required_permits_count", valueNumeric: 6, unit: "count", lastVerified: new Date("2024-11-15") },
      { key: "required_inspections_count", valueNumeric: 5, unit: "count", lastVerified: new Date("2024-11-15") },
      { key: "approval_gates_count", valueNumeric: 3, unit: "count", lastVerified: new Date("2024-11-15") },
      { key: "permit_cost_burden", valueNumeric: 55, unit: "score", lastVerified: new Date("2024-11-15") },
      { key: "fee_schedule_online", valueNumeric: 1, unit: "boolean", lastVerified: new Date("2024-11-15") },
      { key: "zoning_map_online", valueNumeric: 1, unit: "boolean", lastVerified: new Date("2024-11-15") },
      { key: "minutes_searchable", valueNumeric: 1, unit: "boolean", lastVerified: new Date("2024-11-15") },
      { key: "permit_portal", valueNumeric: 1, unit: "boolean", lastVerified: new Date("2024-11-15") },
      { key: "clear_checklists", valueNumeric: 1, unit: "boolean", lastVerified: new Date("2024-11-15") },
      { key: "special_assessments_present", valueNumeric: 0, unit: "boolean", lastVerified: new Date("2024-11-15") },
      { key: "debt_per_capita", valueNumeric: 1200, unit: "dollars", lastVerified: new Date("2024-11-15") },
    ];

    for (const mv of metricValues) {
      const def = getDef(mv.key);
      const existing = await prisma.metricValue.findFirst({
        where: { jurisdictionId: holland.id, metricDefId: def.id },
      });
      if (!existing) {
        const created = await prisma.metricValue.create({
          data: {
            jurisdictionId: holland.id,
            metricDefId: def.id,
            valueNumeric: mv.valueNumeric,
            lastVerified: mv.lastVerified,
            notes: mv.notes,
          },
        });

        // Add citations for key metrics
        const citationMap: Record<string, { source: Awaited<ReturnType<typeof createSource>>; label: string }> = {
          variance_approval_rate_5yr: { source: s1, label: "[1]" },
          rezoning_approval_rate: { source: s5, label: "[2]" },
          avg_permit_processing_days: { source: s3, label: "[3]" },
          millage_rate: { source: s4, label: "[4]" },
          zoning_amendments_10yr: { source: s5, label: "[5]" },
          zoning_litigation_10yr: { source: s6, label: "[6]" },
        };
        const entry = citationMap[mv.key];
        if (entry) {
          await prisma.citation.create({
            data: {
              metricValueId: created.id,
              sourceId: entry.source.id,
              citationLabel: entry.label,
              locatorText: "Board minutes / Planning records",
            },
          });
        }
      }
    }
  }

  // Olive Township - plausible placeholders
  const olive = await prisma.jurisdiction.findUnique({ where: { slug: "olive-township" } });
  if (olive) {
    const sOlive = await prisma.source.findUnique({
      where: { url: "https://www.olivetownship.org/permits-fee-schedules" },
    }) ?? await prisma.source.create({
      data: { url: "https://www.olivetownship.org/permits-fee-schedules", title: "Olive Township Permit Fee Schedule", publisher: "Olive Township", retrievedDate: new Date() },
    });

    const oliveMetrics = [
      { key: "variance_approval_rate_5yr", valueNumeric: 78 },
      { key: "rezoning_approval_rate", valueNumeric: 81 },
      { key: "avg_permit_processing_days", valueNumeric: 28 },
      { key: "millage_rate", valueNumeric: 38.2 },
      { key: "zoning_amendments_10yr", valueNumeric: 12 },
      { key: "zoning_litigation_10yr", valueNumeric: 1 },
      { key: "required_permits_count", valueNumeric: 6 },
      { key: "required_inspections_count", valueNumeric: 4 },
      { key: "approval_gates_count", valueNumeric: 2 },
      { key: "permit_cost_burden", valueNumeric: 48 },
      { key: "fee_schedule_online", valueNumeric: 1 },
      { key: "zoning_map_online", valueNumeric: 1 },
      { key: "minutes_searchable", valueNumeric: 1 },
      { key: "permit_portal", valueNumeric: 0 },
      { key: "clear_checklists", valueNumeric: 1 },
      { key: "special_assessments_present", valueNumeric: 0 },
      { key: "debt_per_capita", valueNumeric: 800 },
    ];

    for (const m of oliveMetrics) {
      const def = getDef(m.key);
      const existing = await prisma.metricValue.findFirst({
        where: { jurisdictionId: olive.id, metricDefId: def.id },
      });
      if (!existing) {
        const created = await prisma.metricValue.create({
          data: {
            jurisdictionId: olive.id,
            metricDefId: def.id,
            valueNumeric: m.valueNumeric,
            lastVerified: new Date("2024-10-01"),
          },
        });
        await prisma.citation.create({
          data: {
            metricValueId: created.id,
            sourceId: sOlive.id,
            citationLabel: "[1]",
            locatorText: "Fee schedule",
          },
        });
      }
    }
  }

  // Georgetown Township - plausible placeholders
  const georgetown = await prisma.jurisdiction.findUnique({ where: { slug: "georgetown-township" } });
  if (georgetown) {
    const sGeo = await prisma.source.findUnique({
      where: { url: "https://www.georgetown-mi.org/building" },
    }) ?? await prisma.source.create({
      data: { url: "https://www.georgetown-mi.org/building", title: "Georgetown Township Building Dept", publisher: "Georgetown Township", retrievedDate: new Date() },
    });

    const geoMetrics = [
      { key: "variance_approval_rate_5yr", valueNumeric: 71 },
      { key: "rezoning_approval_rate", valueNumeric: 68 },
      { key: "avg_permit_processing_days", valueNumeric: 45 },
      { key: "millage_rate", valueNumeric: 44.1 },
      { key: "zoning_amendments_10yr", valueNumeric: 24 },
      { key: "zoning_litigation_10yr", valueNumeric: 5 },
      { key: "required_permits_count", valueNumeric: 7 },
      { key: "required_inspections_count", valueNumeric: 6 },
      { key: "approval_gates_count", valueNumeric: 4 },
      { key: "permit_cost_burden", valueNumeric: 62 },
      { key: "fee_schedule_online", valueNumeric: 1 },
      { key: "zoning_map_online", valueNumeric: 1 },
      { key: "minutes_searchable", valueNumeric: 0 },
      { key: "permit_portal", valueNumeric: 0 },
      { key: "clear_checklists", valueNumeric: 0 },
      { key: "special_assessments_present", valueNumeric: 1 },
      { key: "debt_per_capita", valueNumeric: 2100 },
    ];

    for (const m of geoMetrics) {
      const def = getDef(m.key);
      const existing = await prisma.metricValue.findFirst({
        where: { jurisdictionId: georgetown.id, metricDefId: def.id },
      });
      if (!existing) {
        const created = await prisma.metricValue.create({
          data: {
            jurisdictionId: georgetown.id,
            metricDefId: def.id,
            valueNumeric: m.valueNumeric,
            lastVerified: new Date("2024-09-20"),
          },
        });
        await prisma.citation.create({
          data: {
            metricValueId: created.id,
            sourceId: sGeo.id,
            citationLabel: "[1]",
            locatorText: "Building dept",
          },
        });
      }
    }
  }

  console.log("Seed complete: Holland, Olive, Georgetown townships");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
