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

async function main() {
  // Seed permit types
  for (const pt of PERMIT_TYPES) {
    await prisma.permitType.upsert({
      where: { slug: pt.slug },
      create: pt,
      update: pt,
    });
  }

  // Sample jurisdictions (Phase 1 link directory - real examples from blueprint)
  const jurisdictions = [
    {
      name: "Frenchtown Township",
      type: "township" as const,
      county: "Monroe",
      website: "https://www.frenchtown-mi.org",
      buildingDeptLink: "https://www.frenchtown-mi.org/building",
      healthDeptLink: null, // County handles
      phone: null,
    },
    {
      name: "Garfield Township",
      type: "township" as const,
      county: "Grand Traverse",
      website: "https://www.garfield-twp.com",
      buildingDeptLink: "https://www.garfield-twp.com/building",
      healthDeptLink: null,
      phone: null,
    },
    {
      name: "Lansing",
      type: "city" as const,
      county: "Ingham",
      website: "https://www.lansingmi.gov",
      buildingDeptLink: "https://www.lansingmi.gov/building",
      healthDeptLink: null,
      phone: null,
    },
    {
      name: "Grand Traverse County",
      type: "county" as const,
      county: null,
      website: "https://www.grandtraverse.org",
      buildingDeptLink: null,
      healthDeptLink: "https://www.grandtraverse.org/health",
      phone: null,
    },
    {
      name: "Macomb County",
      type: "county" as const,
      county: null,
      website: "https://www.macombgov.org",
      buildingDeptLink: null,
      healthDeptLink: "https://www.macombgov.org/health",
      phone: null,
    },
    {
      name: "Saginaw County",
      type: "county" as const,
      county: null,
      website: "https://www.saginawcounty.com",
      buildingDeptLink: null,
      healthDeptLink: "https://www.saginawcounty.com/health",
      phone: null,
    },
  ];

  for (const j of jurisdictions) {
    await prisma.jurisdiction.upsert({
      where: { id: j.name }, // Will need to use a different approach
      create: j,
      update: j,
    });
  }

  // Jurisdiction upsert needs unique id - let's use createMany with skipDuplicates or find first
  const existing = await prisma.jurisdiction.findMany();
  if (existing.length === 0) {
    await prisma.jurisdiction.createMany({
      data: jurisdictions,
      skipDuplicates: true,
    });
  }

  console.log("Seed complete: permit types and sample jurisdictions");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
