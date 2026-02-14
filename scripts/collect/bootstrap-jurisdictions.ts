#!/usr/bin/env npx tsx
import {
  JurisdictionLevel,
  ensureDir,
  jurisdictionLevelFromType,
  prisma,
  readJsonFile,
  rootPath,
  timestampToken,
  writeJsonFile,
} from "./shared.ts";
import { pathToFileURL } from "url";

type BootstrapJurisdiction = {
  name: string;
  slug: string;
  type: string;
  county?: string | null;
  website?: string | null;
};

type BootstrapFile = {
  state: BootstrapJurisdiction;
  counties: BootstrapJurisdiction[];
  municipalities: BootstrapJurisdiction[];
};

function fallbackBootstrapData(): BootstrapFile {
  return {
    state: { name: "Michigan", slug: "michigan", type: "state", website: "https://www.michigan.gov" },
    counties: [
      { name: "Ottawa County", slug: "ottawa-county", type: "county", website: "https://miottawa.org" },
    ],
    municipalities: [
      { name: "Holland Charter Township", slug: "holland-charter-township", type: "township", county: "Ottawa" },
      { name: "Olive Township", slug: "olive-township", type: "township", county: "Ottawa" },
      { name: "Georgetown Township", slug: "georgetown-township", type: "township", county: "Ottawa" },
    ],
  };
}

export async function runBootstrapJurisdictions(inputPath?: string) {
  const filePath = inputPath ?? rootPath("data", "reference", "mi-jurisdictions.json");
  let data: BootstrapFile;

  try {
    data = readJsonFile<BootstrapFile>(filePath);
  } catch {
    data = fallbackBootstrapData();
  }

  const state = await prisma.jurisdiction.upsert({
    where: { slug: data.state.slug },
    create: {
      name: data.state.name,
      slug: data.state.slug,
      type: "state",
      level: JurisdictionLevel.STATE,
      state: "MI",
      website: data.state.website ?? null,
      notes: "State-level parent profile.",
      lastVerified: new Date(),
    },
    update: {
      name: data.state.name,
      type: "state",
      level: JurisdictionLevel.STATE,
      state: "MI",
      website: data.state.website ?? null,
      lastVerified: new Date(),
    },
  });

  const countyByName = new Map<string, string>();
  for (const county of data.counties) {
    const countyRecord = await prisma.jurisdiction.upsert({
      where: { slug: county.slug },
      create: {
        name: county.name,
        slug: county.slug,
        type: "county",
        level: JurisdictionLevel.COUNTY,
        parentId: state.id,
        state: "MI",
        website: county.website ?? null,
        county: null,
        lastVerified: new Date(),
      },
      update: {
        name: county.name,
        type: "county",
        level: JurisdictionLevel.COUNTY,
        parentId: state.id,
        website: county.website ?? null,
        lastVerified: new Date(),
      },
    });
    countyByName.set(county.name.replace(/\s+County$/i, "").trim().toLowerCase(), countyRecord.id);
  }

  let municipalCount = 0;
  for (const municipal of data.municipalities) {
    const countyName = (municipal.county ?? "").trim().toLowerCase();
    const parentId = countyByName.get(countyName) ?? null;

    await prisma.jurisdiction.upsert({
      where: { slug: municipal.slug },
      create: {
        name: municipal.name,
        slug: municipal.slug,
        type: municipal.type,
        level: jurisdictionLevelFromType(municipal.type),
        parentId,
        county: municipal.county ?? null,
        state: "MI",
        website: municipal.website ?? null,
        lastVerified: new Date(),
      },
      update: {
        name: municipal.name,
        type: municipal.type,
        level: jurisdictionLevelFromType(municipal.type),
        parentId,
        county: municipal.county ?? null,
        website: municipal.website ?? null,
        lastVerified: new Date(),
      },
    });
    municipalCount += 1;
  }

  const report = {
    status: "ok",
    sourceFile: filePath,
    createdAt: new Date().toISOString(),
    totals: {
      states: 1,
      counties: data.counties.length,
      municipalities: municipalCount,
    },
  };

  ensureDir(rootPath("output", "reports"));
  writeJsonFile(rootPath("output", "reports", `bootstrap-${timestampToken()}.json`), report);
  return report;
}

const isMain = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false;

if (isMain) {
  runBootstrapJurisdictions(process.argv[2])
    .then((report) => {
      console.log(`Bootstrapped jurisdictions: ${JSON.stringify(report.totals)}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
