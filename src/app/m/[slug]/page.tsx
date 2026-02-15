import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  computeRegulatoryIntensity,
  computePredictability,
  computeFiscalBurden,
  computeTransparencyGrade,
  computeDataConfidence,
  getStalenessBadge,
} from "@/lib/scoring";
import type { MetricValueRow } from "@/lib/scoring";
import { SnapshotCards } from "@/components/SnapshotCards";
import { DetailsTable } from "@/components/DetailsTable";
import { SourcesPanel } from "@/components/SourcesPanel";
import { MethodologyPanel } from "@/components/MethodologyPanel";
import { PathToggle } from "@/components/PathToggle";
import { SocialSentimentPanel } from "@/components/SocialSentimentPanel";

export const dynamic = "force-dynamic";

function locationLabelForJurisdiction(j: {
  type: string;
  level?: string | null;
  county: string | null;
  state: string;
}): string {
  const level = j.level?.toUpperCase();
  if (level === "STATE" || j.type === "state") return j.state;
  if (level === "COUNTY" || j.type === "county") return j.state;
  return j.county ? `${j.county} County, ${j.state}` : j.state;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const j = await prisma.jurisdiction.findUnique({
    where: { slug },
    select: { name: true, county: true, state: true, type: true, level: true },
  });
  if (!j) return { title: "Municipality" };
  const location = locationLabelForJurisdiction(j);
  return {
    title: `${j.name} | Municipal Governance & Buildability`,
    description: `Governance profile for ${j.name} (${location}). Permits, predictability, fiscal burden, and transparency.`,
  };
}

export default async function MunicipalityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { slug } = await params;
  const { path: pathParam } = await searchParams;
  const path = pathParam === "commercial" ? "commercial" : "residential";
  const sentimentWindowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const jurisdiction = await prisma.jurisdiction.findUnique({
    where: { slug },
    include: {
      metricValues: {
        include: {
          metricDef: true,
          citations: { include: { source: true } },
        },
      },
      socialMentions: {
        where: { postedAt: { gte: sentimentWindowStart } },
        orderBy: { postedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!jurisdiction) notFound();

  const pathFilteredValues = jurisdiction.metricValues.filter((mv) =>
    path === "commercial" ? mv.metricDef.pathCommercial : mv.metricDef.pathResidential
  );

  const metrics: MetricValueRow[] = pathFilteredValues.map((mv) => ({
    key: mv.metricDef.key,
    status: mv.status,
    valueNumeric: mv.valueNumeric,
    valueText: mv.valueText,
    unit: mv.metricDef.unit,
  }));

  const regulatory = computeRegulatoryIntensity(metrics);
  const predictability = computePredictability(metrics);
  const fiscal = computeFiscalBurden(metrics);
  const transparency = computeTransparencyGrade(metrics);
  const { stars: dataConfidenceStars, dataQualityNote } = computeDataConfidence(metrics);

  const lastVerified = jurisdiction.lastVerified ?? jurisdiction.metricValues[0]?.lastVerified ?? null;
  const staleness = getStalenessBadge(lastVerified);
  const location = locationLabelForJurisdiction(jurisdiction);

  const summaryLines = [
    regulatory.score != null
      ? regulatory.score > 70
        ? "Higher regulatory friction. Expect multiple inspections and longer processing times."
        : regulatory.score > 40
          ? "Moderate regulatory friction. Expect multiple inspections and average processing times."
          : "Lower regulatory friction. Fewer approval gates and faster processing."
      : "Insufficient data for regulatory intensity.",
    predictability.score != null
      ? predictability.score > 70
        ? "High development predictability. Consistent approval patterns."
        : predictability.score > 40
          ? "Moderate predictability. Some variance in approval outcomes."
          : "Lower predictability. More ordinance changes and potential for delays."
      : "Insufficient data for predictability.",
  ];

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back to search
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          {jurisdiction.name}
        </h1>
        <p className="mt-1 text-stone-600">
          {location}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs text-white ${staleness.color}`}
          >
            Last verified: {lastVerified ? new Date(lastVerified).toLocaleDateString() : "Unknown"}
          </span>
        </div>
      </header>

      <PathToggle slug={slug} path={path} />

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <strong>Decision-support tool.</strong> Informational only. Always verify
        with the jurisdiction.
      </div>

      <SnapshotCards
        regulatoryScore={regulatory.score}
        predictabilityScore={predictability.score}
        fiscalScore={fiscal.score}
        transparencyGrade={transparency.grade}
        summaryLines={summaryLines}
        regulatoryDrivers={regulatory.drivers}
        predictabilityDrivers={predictability.drivers}
        fiscalDrivers={fiscal.drivers}
        transparencyDrivers={transparency.drivers}
        dataConfidenceStars={dataConfidenceStars}
        dataQualityNote={dataQualityNote}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-stone-800">Details</h2>
          <DetailsTable
            metricValues={pathFilteredValues}
            path={path}
          />
        </section>
        <section>
          <h2 className="text-lg font-semibold text-stone-800">Sources</h2>
          <SourcesPanel metricValues={pathFilteredValues} />
          <div className="mt-4">
            <SocialSentimentPanel mentions={jurisdiction.socialMentions} />
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">Methodology</h2>
        <MethodologyPanel />
      </section>
    </div>
  );
}
