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

// Ottawa County + 5 municipalities (narrow launch scope)
const JURISDICTIONS = [
  {
    name: "Ottawa County",
    type: "county" as const,
    county: null,
    website: "https://www.miottawa.org",
    phone: "(616) 738-4810",
    buildingDeptLink: "https://www.miottawa.org/Planning/fee-schedule.htm",
    healthDeptLink: "https://www.miottawa.org/Health",
    address: "12220 Fillmore St, West Olive, MI 49460",
    officeHours: "Mon–Fri 8am–5pm",
    notes: "Building permits are issued by individual townships/cities. County handles environmental health (septic, well). See township for building permit fees.",
  },
  {
    name: "Georgetown Township",
    type: "township" as const,
    county: "Ottawa",
    website: "https://www.georgetown-mi.org",
    phone: null,
    buildingDeptLink: "https://www.georgetown-mi.org/building",
    healthDeptLink: null,
    address: null,
    officeHours: null,
    notes: "Ottawa County township. Building permits at township level.",
  },
  {
    name: "Holland Charter Township",
    type: "township" as const,
    county: "Ottawa",
    website: "https://www.hollandtownship.org",
    phone: null,
    buildingDeptLink: "https://www.hollandtownship.org/building",
    healthDeptLink: null,
    address: null,
    officeHours: null,
    notes: "Ottawa County township.",
  },
  {
    name: "Olive Township",
    type: "township" as const,
    county: "Ottawa",
    website: "https://www.olivetownship.org",
    phone: null,
    buildingDeptLink: "https://www.olivetownship.org/permits-fee-schedules",
    healthDeptLink: null,
    address: null,
    officeHours: null,
    notes: "Ottawa County township. Fee schedules published.",
  },
  {
    name: "Park Township",
    type: "township" as const,
    county: "Ottawa",
    website: "https://www.parktwp.org",
    phone: null,
    buildingDeptLink: "https://www.parktwp.org/building",
    healthDeptLink: null,
    address: null,
    officeHours: null,
    notes: "Ottawa County township.",
  },
  {
    name: "Zeeland Charter Township",
    type: "township" as const,
    county: "Ottawa",
    website: "https://www.zeelandtownship.org",
    phone: null,
    buildingDeptLink: "https://www.zeelandtownship.org/building",
    healthDeptLink: null,
    address: null,
    officeHours: null,
    notes: "Ottawa County township.",
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

  for (const j of JURISDICTIONS) {
    const existing = await prisma.jurisdiction.findFirst({
      where: { name: j.name },
    });
    if (!existing) {
      await prisma.jurisdiction.create({ data: j });
    }
  }

  const ottawa = await prisma.jurisdiction.findFirst({ where: { name: "Ottawa County" } });
  const olive = await prisma.jurisdiction.findFirst({ where: { name: "Olive Township" } });

  // Fee items for Ottawa County (environmental health)
  if (ottawa) {
    const permitTypes = await prisma.permitType.findMany();
    const getPt = (slug: string) => permitTypes.find((p) => p.slug === slug)!;
    const existingFees = await prisma.feeItem.count({ where: { jurisdictionId: ottawa.id } });
    if (existingFees === 0) {
      await prisma.feeItem.createMany({
        data: [
          { jurisdictionId: ottawa.id, permitTypeId: getPt("septic").id, feeName: "Septic System NEW (Private Single Family)", amount: 535, units: "flat", sourceUrl: "https://www.miottawa.org/Health", notes: "Range $535–$980", lastVerifiedDate: new Date() },
          { jurisdictionId: ottawa.id, permitTypeId: getPt("well").id, feeName: "Well System NEW (Private Single Family)", amount: 445, units: "flat", sourceUrl: "https://www.miottawa.org/Health", lastVerifiedDate: new Date() },
          { jurisdictionId: ottawa.id, permitTypeId: getPt("soil_eval").id, feeName: "Septic & Well Systems Evaluation", amount: 345, units: "flat", sourceUrl: "https://www.miottawa.org/Health", notes: "Range $345–$370", lastVerifiedDate: new Date() },
        ],
      });
    }

    // Sample governance metrics (measurable indicators)
    const existingMetrics = await prisma.governanceMetric.count({ where: { jurisdictionId: ottawa.id } });
    if (existingMetrics === 0) {
      await prisma.governanceMetric.createMany({
        data: [
          { jurisdictionId: ottawa.id, path: "residential", metricType: "permit_cost_formula", metricName: "Building permit (township)", valueText: "Varies by township; many use $X per $1,000 valuation", unit: "formula", sourceUrl: "https://www.miottawa.org/Planning/fee-schedule.htm", lastVerifiedDate: new Date() },
          { jurisdictionId: ottawa.id, path: "residential", metricType: "permit_processing_days", metricName: "Typical permit review (estimate)", valueNumeric: 14, unit: "days", year: 2024, notes: "Varies by township", lastVerifiedDate: new Date() },
          { jurisdictionId: ottawa.id, path: "residential", metricType: "transparency", metricName: "Fee schedule published online", valueText: "Yes (county health)", unit: "other", sourceUrl: "https://www.miottawa.org/Health", lastVerifiedDate: new Date() },
        ],
      });
    }

    // Sample dimension scores (methodology-derived)
    const existingDims = await prisma.governanceDimension.count({ where: { jurisdictionId: ottawa.id } });
    if (existingDims === 0) {
      await prisma.governanceDimension.createMany({
        data: [
          { jurisdictionId: ottawa.id, path: "residential", dimension: "transparency", score: 72, methodologyNote: "Fee schedules available; township variance" },
          { jurisdictionId: ottawa.id, path: "residential", dimension: "predictability", score: 65, methodologyNote: "County health process documented" },
        ],
      });
    }
  }

  // Olive Township sample metrics (from web search - they publish fees)
  if (olive) {
    const permitTypes = await prisma.permitType.findMany();
    const getPt = (slug: string) => permitTypes.find((p) => p.slug === slug)!;
    const existingFees = await prisma.feeItem.count({ where: { jurisdictionId: olive.id } });
    if (existingFees === 0) {
      await prisma.feeItem.createMany({
        data: [
          { jurisdictionId: olive.id, permitTypeId: getPt("electrical").id, feeName: "New House", amount: 285, units: "flat", sourceUrl: "https://www.olivetownship.org/permits-fee-schedules", lastVerifiedDate: new Date() },
          { jurisdictionId: olive.id, permitTypeId: getPt("mechanical").id, feeName: "New House", amount: 190, units: "flat", sourceUrl: "https://www.olivetownship.org/permits-fee-schedules", lastVerifiedDate: new Date() },
          { jurisdictionId: olive.id, permitTypeId: getPt("plumbing").id, feeName: "New House", amount: 190, units: "flat", sourceUrl: "https://www.olivetownship.org/permits-fee-schedules", lastVerifiedDate: new Date() },
        ],
      });
    }

    const existingMetrics = await prisma.governanceMetric.count({ where: { jurisdictionId: olive.id } });
    if (existingMetrics === 0) {
      await prisma.governanceMetric.createMany({
        data: [
          { jurisdictionId: olive.id, path: "residential", metricType: "permit_cost_formula", metricName: "Electrical – New House", valueNumeric: 285, unit: "dollars", sourceUrl: "https://www.olivetownship.org/permits-fee-schedules", lastVerifiedDate: new Date() },
          { jurisdictionId: olive.id, path: "residential", metricType: "transparency", metricName: "Fee schedule published", valueText: "Yes", unit: "other", lastVerifiedDate: new Date() },
        ],
      });
    }
  }

  // Source docs
  if (ottawa) {
    const existingDocs = await prisma.sourceDoc.count({ where: { jurisdictionId: ottawa.id } });
    if (existingDocs === 0) {
      await prisma.sourceDoc.createMany({
        data: [
          { jurisdictionId: ottawa.id, url: "https://www.miottawa.org/Health", documentTitle: "Ottawa County Health Dept", filetype: "html" },
          { jurisdictionId: ottawa.id, url: "https://www.miottawa.org/Planning/fee-schedule.htm", documentTitle: "Ottawa County Fee Schedule", filetype: "html" },
        ],
      });
    }
  }

  console.log("Seed complete: Ottawa County + 5 municipalities");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
