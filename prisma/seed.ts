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
    website: "https://www.hct.holland.mi.us",
    buildingDeptLink: "https://www.hct.holland.mi.us/permits",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: "(616) 396-2345",
    address: "353 N. 120th Avenue, Holland, MI 49424",
    officeHours: "Mon–Fri 8am–5pm",
    notes: "Ottawa County township. Septic/well permits via Ottawa County Health.",
    lastVerified: new Date("2025-02-14"),
  },
  {
    name: "Olive Township",
    slug: "olive-township",
    type: "township" as const,
    county: "Ottawa",
    state: "MI",
    website: "https://www.olivetownship.org",
    buildingDeptLink: "https://www.olivetownship.org/permits-fee-schedules",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: null,
    address: null,
    officeHours: null,
    notes: "Ottawa County township. Fee schedule effective 01/01/2025.",
    lastVerified: new Date("2025-02-14"),
  },
  {
    name: "Georgetown Township",
    slug: "georgetown-township",
    type: "township" as const,
    county: "Ottawa",
    state: "MI",
    website: "https://www.gtwp.com",
    buildingDeptLink: "https://www.gtwp.com/193/Forms",
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: "(616) 457-2340",
    address: "1515 Baldwin St., Jenison, MI 49428",
    officeHours: null,
    notes: "Uses Professional Code Inspections (PCI) for building. Zoning fees: $50 (additions/decks/sheds), $100 (1000+ sq ft).",
    lastVerified: new Date("2025-02-14"),
  },
  {
    name: "Ottawa County",
    slug: "ottawa-county",
    type: "county" as const,
    county: null,
    state: "MI",
    website: "https://miottawa.org",
    buildingDeptLink: null,
    healthDeptLink: "https://miottawa.org/health/environmental/well-septic",
    phone: "(616) 393-5645",
    address: null,
    officeHours: null,
    notes: "Environmental health: septic, well, soil evaluation. Building permits at township level.",
    lastVerified: new Date("2025-02-14"),
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

  const createSource = async (url: string, title: string, publisher: string | null) => {
    const existing = await prisma.source.findUnique({ where: { url } });
    if (existing) return existing;
    return prisma.source.create({
      data: { url, title, publisher, retrievedDate: new Date() },
    });
  };

  // Holland Charter Township — verified data (2025-02-14)
  const holland = await prisma.jurisdiction.findUnique({
    where: { slug: "holland-charter-township" },
  });
  if (holland) {
    const sMillage = await createSource("https://www.hct.holland.mi.us/departments/treasurer/tax-millage-rates", "2025 Tax Millage Rates", "Holland Charter Township");
    const sPermits = await createSource("https://www.hct.holland.mi.us/permits", "Building Permits", "Holland Charter Township");
    const sInfoPackets = await createSource("https://www.hct.holland.mi.us/forms/building-department-forms-information-packets/information-packets", "Building Dept Information Packets", "Holland Charter Township");
    const sPlanning = await createSource("https://www.hct.holland.mi.us", "Holland Charter Township", "Holland Charter Township");
    const sCourts = await createSource("https://www.courts.michigan.gov", "Michigan Court Records", "State of Michigan");

    const hollandMetrics = [
      { key: "variance_approval_rate_5yr", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research: planning minutes 2019-2024", citationSource: sPlanning },
      { key: "rezoning_approval_rate", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research: planning minutes", citationSource: sPlanning },
      { key: "avg_permit_processing_days", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Contact building dept or FOIA", citationSource: sPermits },
      { key: "millage_rate", valueNumeric: 31.98, lastVerified: new Date("2025-02-14"), notes: "2025 Total PRE, Holland school district. Township 4.86 mills.", citationSource: sMillage },
      { key: "zoning_amendments_10yr", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research: ordinance history", citationSource: sPlanning },
      { key: "zoning_litigation_10yr", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research: courts.michigan.gov", citationSource: sCourts },
      { key: "required_permits_count", valueNumeric: 6, lastVerified: new Date("2025-02-14"), notes: "Building, electrical, mechanical, plumbing, septic, well (typical SFH)", citationSource: sPermits },
      { key: "required_inspections_count", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "From fee schedule when available", citationSource: sInfoPackets },
      { key: "approval_gates_count", valueNumeric: 3, lastVerified: new Date("2025-02-14"), notes: "Zoning, building, Ottawa County health (septic/well)", citationSource: sPermits },
      { key: "permit_cost_burden", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Compute from fee totals when available", citationSource: sPermits },
      { key: "fee_schedule_online", valueNumeric: 1, lastVerified: new Date("2025-02-14"), notes: "Info packets contain fee info", citationSource: sInfoPackets },
      { key: "zoning_map_online", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD: check zoning/planning pages", citationSource: sPlanning },
      { key: "minutes_searchable", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD: check meeting recordings", citationSource: sPlanning },
      { key: "permit_portal", valueNumeric: 0, lastVerified: new Date("2025-02-14"), notes: "Forms dropped off or mailed", citationSource: sPermits },
      { key: "clear_checklists", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Info packets may contain", citationSource: sInfoPackets },
      { key: "special_assessments_present", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD: budget/CAFR", citationSource: sMillage },
      { key: "debt_per_capita", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD: CAFR", citationSource: sMillage },
    ];

    for (const mv of hollandMetrics) {
      const def = getDef(mv.key);
      const existing = await prisma.metricValue.findFirst({
        where: { jurisdictionId: holland.id, metricDefId: def.id },
      });
      const valueData = {
        jurisdictionId: holland.id,
        metricDefId: def.id,
        valueNumeric: mv.valueNumeric,
        lastVerified: mv.lastVerified,
        notes: mv.notes,
      };
      const createdOrUpdated = existing
        ? await prisma.metricValue.update({ where: { id: existing.id }, data: valueData })
        : await prisma.metricValue.create({ data: valueData });

      if (mv.citationSource) {
        const hasCitation = await prisma.citation.findFirst({
          where: { metricValueId: createdOrUpdated.id, sourceId: mv.citationSource.id },
        });
        if (!hasCitation) {
          await prisma.citation.create({
            data: {
              metricValueId: createdOrUpdated.id,
              sourceId: mv.citationSource.id,
              locatorText: mv.notes?.slice(0, 100) ?? null,
            },
          });
        }
      }
    }
  }

  // Olive Township — verified transparency + fee schedule (2025-02-14)
  const olive = await prisma.jurisdiction.findUnique({ where: { slug: "olive-township" } });
  if (olive) {
    const sOlive = await createSource("https://www.olivetownship.org/permits-fee-schedules", "Olive Township Permit Fee Schedule", "Olive Township");

    const oliveMetrics = [
      { key: "variance_approval_rate_5yr", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research: planning minutes", citationSource: sOlive },
      { key: "rezoning_approval_rate", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research", citationSource: sOlive },
      { key: "avg_permit_processing_days", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD", citationSource: sOlive },
      { key: "millage_rate", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD: county equalization", citationSource: sOlive },
      { key: "zoning_amendments_10yr", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research", citationSource: sOlive },
      { key: "zoning_litigation_10yr", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research: court records", citationSource: sOlive },
      { key: "required_permits_count", valueNumeric: 6, lastVerified: new Date("2025-02-14"), notes: "Building, electrical, mechanical, plumbing, septic, well", citationSource: sOlive },
      { key: "required_inspections_count", valueNumeric: 6, lastVerified: new Date("2025-02-14"), notes: "Typical new SFH: footing, rough E/M/P, final E/M/P per fee schedule", citationSource: sOlive },
      { key: "approval_gates_count", valueNumeric: 3, lastVerified: new Date("2025-02-14"), notes: "Zoning, building, Ottawa County health", citationSource: sOlive },
      { key: "permit_cost_burden", valueNumeric: 63, lastVerified: new Date("2025-02-14"), notes: "Trades $665 + septic $535 + well $445 = $1645; normalized 0-100", citationSource: sOlive },
      { key: "fee_schedule_online", valueNumeric: 1, lastVerified: new Date("2025-02-14"), notes: "Verified: permits-fee-schedules page", citationSource: sOlive },
      { key: "zoning_map_online", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD", citationSource: sOlive },
      { key: "minutes_searchable", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD", citationSource: sOlive },
      { key: "permit_portal", valueNumeric: 0, lastVerified: new Date("2025-02-14"), notes: "Applications to office", citationSource: sOlive },
      { key: "clear_checklists", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD", citationSource: sOlive },
      { key: "special_assessments_present", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD", citationSource: sOlive },
      { key: "debt_per_capita", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD: CAFR", citationSource: sOlive },
    ];

    for (const m of oliveMetrics) {
      const def = getDef(m.key);
      const existing = await prisma.metricValue.findFirst({
        where: { jurisdictionId: olive.id, metricDefId: def.id },
      });
      const valueData = {
        jurisdictionId: olive.id,
        metricDefId: def.id,
        valueNumeric: m.valueNumeric,
        lastVerified: m.lastVerified,
        notes: m.notes,
      };
      const createdOrUpdated = existing
        ? await prisma.metricValue.update({ where: { id: existing.id }, data: valueData })
        : await prisma.metricValue.create({ data: valueData });
      if (m.citationSource) {
        const hasCitation = await prisma.citation.findFirst({
          where: { metricValueId: createdOrUpdated.id, sourceId: m.citationSource.id },
        });
        if (!hasCitation) {
          await prisma.citation.create({
            data: {
              metricValueId: createdOrUpdated.id,
              sourceId: m.citationSource.id,
              locatorText: m.notes?.slice(0, 100) ?? null,
            },
          });
        }
      }
    }

    // Olive Township fee items (verified from fee schedule effective 01/01/2025)
    const permitTypes = await prisma.permitType.findMany();
    const getPt = (slug: string) => permitTypes.find((p) => p.slug === slug)!;
    const oliveFees = [
      { permitTypeSlug: "electrical", feeName: "New House", amount: 285, notes: "$380 with temporary service" },
      { permitTypeSlug: "electrical", feeName: "Remodel", amount: 95, notes: "Per inspection" },
      { permitTypeSlug: "mechanical", feeName: "New House", amount: 190 },
      { permitTypeSlug: "mechanical", feeName: "Remodel", amount: 95, notes: "Per inspection" },
      { permitTypeSlug: "plumbing", feeName: "New House", amount: 190, notes: "$285 with underground" },
      { permitTypeSlug: "plumbing", feeName: "Remodel", amount: 95, notes: "Per inspection" },
    ];
    for (const f of oliveFees) {
      const pt = getPt(f.permitTypeSlug);
      const existingFee = await prisma.feeItem.findFirst({
        where: { jurisdictionId: olive.id, permitTypeId: pt.id, feeName: f.feeName },
      });
      const feeData = {
        jurisdictionId: olive.id,
        permitTypeId: pt.id,
        feeName: f.feeName,
        amount: f.amount,
        notes: f.notes ?? null,
        sourceUrl: "https://www.olivetownship.org/permits-fee-schedules",
        lastVerifiedDate: new Date("2025-02-14"),
      };
      if (existingFee) {
        await prisma.feeItem.update({ where: { id: existingFee.id }, data: feeData });
      } else {
        await prisma.feeItem.create({ data: feeData });
      }
    }
  }

  // Georgetown Township — verified URLs, transparency TBD (2025-02-14)
  const georgetown = await prisma.jurisdiction.findUnique({ where: { slug: "georgetown-township" } });
  if (georgetown) {
    const sGeo = await createSource("https://www.gtwp.com/193/Forms", "Georgetown Township Forms", "Georgetown Township");

    const geoMetrics = [
      { key: "variance_approval_rate_5yr", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research", citationSource: sGeo },
      { key: "rezoning_approval_rate", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research", citationSource: sGeo },
      { key: "avg_permit_processing_days", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "PCI determines", citationSource: sGeo },
      { key: "millage_rate", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD: gtwp.com/DocumentCenter/View/7648/Tax-Rates-2024", citationSource: sGeo },
      { key: "zoning_amendments_10yr", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research", citationSource: sGeo },
      { key: "zoning_litigation_10yr", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "Manual research", citationSource: sGeo },
      { key: "required_permits_count", valueNumeric: 7, lastVerified: new Date("2025-02-14"), notes: "Building via PCI + zoning + septic/well", citationSource: sGeo },
      { key: "required_inspections_count", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "PCI determines", citationSource: sGeo },
      { key: "approval_gates_count", valueNumeric: 4, lastVerified: new Date("2025-02-14"), notes: "Zoning, PCI building, Ottawa County health, road commission", citationSource: sGeo },
      { key: "permit_cost_burden", valueNumeric: 52, lastVerified: new Date("2025-02-14"), notes: "Zoning $100 + septic $535 + well $445 = $1080; building via PCI", citationSource: sGeo },
      { key: "fee_schedule_online", valueNumeric: 1, lastVerified: new Date("2025-02-14"), notes: "Zoning fees $50/$100 on FAQ; building via PCI", citationSource: sGeo },
      { key: "zoning_map_online", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD", citationSource: sGeo },
      { key: "minutes_searchable", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD: meeting agendas/minutes", citationSource: sGeo },
      { key: "permit_portal", valueNumeric: 0, lastVerified: new Date("2025-02-14"), notes: "Forms on gtwp.com; no online submission", citationSource: sGeo },
      { key: "clear_checklists", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD", citationSource: sGeo },
      { key: "special_assessments_present", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD", citationSource: sGeo },
      { key: "debt_per_capita", valueNumeric: null, lastVerified: new Date("2025-02-14"), notes: "TBD", citationSource: sGeo },
    ];

    for (const m of geoMetrics) {
      const def = getDef(m.key);
      const existing = await prisma.metricValue.findFirst({
        where: { jurisdictionId: georgetown.id, metricDefId: def.id },
      });
      const valueData = {
        jurisdictionId: georgetown.id,
        metricDefId: def.id,
        valueNumeric: m.valueNumeric,
        lastVerified: m.lastVerified,
        notes: m.notes,
      };
      const createdOrUpdated = existing
        ? await prisma.metricValue.update({ where: { id: existing.id }, data: valueData })
        : await prisma.metricValue.create({ data: valueData });
      if (m.citationSource) {
        const hasCitation = await prisma.citation.findFirst({
          where: { metricValueId: createdOrUpdated.id, sourceId: m.citationSource.id },
        });
        if (!hasCitation) {
          await prisma.citation.create({
            data: {
              metricValueId: createdOrUpdated.id,
              sourceId: m.citationSource.id,
              locatorText: m.notes?.slice(0, 100) ?? null,
            },
          });
        }
      }
    }
  }

  // Ottawa County — environmental health fees (septic, well) for all townships
  const ottawa = await prisma.jurisdiction.findUnique({ where: { slug: "ottawa-county" } });
  if (ottawa) {
    const permitTypes = await prisma.permitType.findMany();
    const getPt = (slug: string) => permitTypes.find((p) => p.slug === slug)!;
    const ottawaFees = [
      { permitTypeSlug: "septic", feeName: "Septic NEW (Private Single Family)", amount: 535, sourceUrl: "https://miottawa.org/fee-schedule" },
      { permitTypeSlug: "septic", feeName: "Septic & Well NEW (Private Single Family)", amount: 980, sourceUrl: "https://miottawa.org/fee-schedule" },
      { permitTypeSlug: "well", feeName: "Well NEW (Private Single Family)", amount: 445, sourceUrl: "https://miottawa.org/fee-schedule" },
      { permitTypeSlug: "soil_eval", feeName: "Vacant Land Evaluation / Perk Test", amount: 400, sourceUrl: "https://miottawa.org/fee-schedule" },
      { permitTypeSlug: "soil_eval", feeName: "Real Estate Transfer Evaluation", amount: 345, sourceUrl: "https://miottawa.org/fee-schedule" },
    ];
    for (const f of ottawaFees) {
      const pt = getPt(f.permitTypeSlug);
      const existingFee = await prisma.feeItem.findFirst({
        where: { jurisdictionId: ottawa.id, permitTypeId: pt.id, feeName: f.feeName },
      });
      const feeData = {
        jurisdictionId: ottawa.id,
        permitTypeId: pt.id,
        feeName: f.feeName,
        amount: f.amount,
        sourceUrl: f.sourceUrl,
        lastVerifiedDate: new Date("2025-02-14"),
      };
      if (existingFee) {
        await prisma.feeItem.update({ where: { id: existingFee.id }, data: feeData });
      } else {
        await prisma.feeItem.create({ data: feeData });
      }
    }
  }

  console.log("Seed complete: Holland, Olive, Georgetown townships + Ottawa County");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
