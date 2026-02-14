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

// Ottawa County & Allegan County - Phase 1 launch jurisdictions
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
    name: "Allegan County",
    type: "county" as const,
    county: null,
    website: "https://www.allegancounty.org",
    phone: "(269) 673-5415",
    buildingDeptLink: null,
    healthDeptLink: "https://www.allegancounty.org/health/environmental-health/field",
    address: "3255 122nd Ave, Suite 200, Allegan, MI 49010",
    officeHours: "Mon–Fri 8am–5pm",
    notes: "Building permits are township/city level. County Environmental Health handles septic, well, and soil erosion permits.",
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

  // Seed fee items for Ottawa County (from published fee schedules)
  const ottawa = await prisma.jurisdiction.findFirst({ where: { name: "Ottawa County" } });
  const allegan = await prisma.jurisdiction.findFirst({ where: { name: "Allegan County" } });

  if (ottawa) {
    const permitTypes = await prisma.permitType.findMany();
    const getPt = (slug: string) => permitTypes.find((p) => p.slug === slug)!;
    const existingFees = await prisma.feeItem.count({ where: { jurisdictionId: ottawa.id } });
    if (existingFees === 0) {
      await prisma.feeItem.createMany({
        data: [
          { jurisdictionId: ottawa.id, permitTypeId: getPt("septic").id, feeName: "Septic System NEW (Private Single Family)", amount: 535, units: "flat", sourceUrl: "https://www.miottawa.org/Health/fees.htm", notes: "Range $535–$980 depending on system type", lastVerifiedDate: new Date() },
          { jurisdictionId: ottawa.id, permitTypeId: getPt("well").id, feeName: "Well System NEW (Private Single Family)", amount: 445, units: "flat", sourceUrl: "https://www.miottawa.org/Health/fees.htm", lastVerifiedDate: new Date() },
          { jurisdictionId: ottawa.id, permitTypeId: getPt("soil_eval").id, feeName: "Septic & Well Systems Evaluation", amount: 345, units: "flat", sourceUrl: "https://www.miottawa.org/Health/fees.htm", notes: "Range $345–$370", lastVerifiedDate: new Date() },
        ],
      });
    }
  }

  if (allegan) {
    const permitTypes = await prisma.permitType.findMany();
    const getPt = (slug: string) => permitTypes.find((p) => p.slug === slug)!;
    const existingFees = await prisma.feeItem.count({ where: { jurisdictionId: allegan.id } });
    if (existingFees === 0) {
      await prisma.feeItem.createMany({
        data: [
          { jurisdictionId: allegan.id, permitTypeId: getPt("septic").id, feeName: "Residential On-Site Sewage", amount: 362, units: "flat", sourceUrl: "https://www.allegancounty.org/health/environmental-health/field", lastVerifiedDate: new Date("2024-11-01") },
          { jurisdictionId: allegan.id, permitTypeId: getPt("septic").id, feeName: "Combined Well/Septic", amount: 591, units: "flat", sourceUrl: "https://www.allegancounty.org/health/environmental-health/field", lastVerifiedDate: new Date("2024-11-01") },
          { jurisdictionId: allegan.id, permitTypeId: getPt("well").id, feeName: "Well Permit (includes lab fee)", amount: 295, units: "flat", sourceUrl: "https://www.allegancounty.org/health/environmental-health/field", lastVerifiedDate: new Date("2024-11-01") },
          { jurisdictionId: allegan.id, permitTypeId: getPt("soil_eval").id, feeName: "Site Survey/Vacant Land Evaluation", amount: 330, units: "flat", sourceUrl: "https://www.allegancounty.org/health/environmental-health/field", lastVerifiedDate: new Date("2024-11-01") },
        ],
      });
    }
  }

  // Source docs for trust/transparency
  if (ottawa) {
    const existingDocs = await prisma.sourceDoc.count({ where: { jurisdictionId: ottawa.id } });
    if (existingDocs === 0) {
      await prisma.sourceDoc.createMany({
        data: [
          { jurisdictionId: ottawa.id, url: "https://www.miottawa.org/Health/fees.htm", documentTitle: "Ottawa County Health Dept – Fees, Lots, Plats", filetype: "html" },
          { jurisdictionId: ottawa.id, url: "https://www.miottawa.org/Planning/fee-schedule.htm", documentTitle: "Ottawa County Fee Schedule", filetype: "html" },
        ],
      });
    }
  }

  if (allegan) {
    const existingDocs = await prisma.sourceDoc.count({ where: { jurisdictionId: allegan.id } });
    if (existingDocs === 0) {
      await prisma.sourceDoc.createMany({
        data: [
          { jurisdictionId: allegan.id, url: "https://www.allegancounty.org/health/environmental-health/field", documentTitle: "Allegan County Environmental Health – Field Services", filetype: "html" },
          { jurisdictionId: allegan.id, url: "https://bldhd.org/media/uploads/Environmental%20Health%20Form/2025_fy_eh_fee_schedule_-_adopted.pdf", documentTitle: "Allegan County EH Fee Schedule FY2025 (PDF)", filetype: "pdf" },
        ],
      });
    }
  }

  console.log("Seed complete: Ottawa County + Allegan County");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
