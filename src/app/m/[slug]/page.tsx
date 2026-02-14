import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  computeRegulatoryIntensity,
  computePredictability,
  computeFiscalBurden,
  computeTransparencyGrade,
  getStalenessBadge,
} from "@/lib/scoring";
import type { MetricValueRow } from "@/lib/scoring";
import { SnapshotCards } from "@/components/SnapshotCards";
import { DetailsTable } from "@/components/DetailsTable";
import { SourcesPanel } from "@/components/SourcesPanel";
import { MethodologyPanel } from "@/components/MethodologyPanel";
import { PathToggle } from "@/components/PathToggle";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const j = await prisma.jurisdiction.findUnique({
    where: { slug },
    select: { name: true, county: true },
  });
  if (!j) return { title: "Municipality" };
  return {
    title: `${j.name} | Municipal Governance & Buildability`,
    description: `Governance profile for ${j.name}, ${j.county ?? "Michigan"} County. Permits, predictability, fiscal burden, transparency.`,
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

  const jurisdiction = await prisma.jurisdiction.findUnique({
    where: { slug },
    include: {
      metricValues: {
        include: {
          metricDef: true,
          citations: { include: { source: true } },
        },
      },
    },
  });

  if (!jurisdiction) notFound();

  const pathFilteredValues = jurisdiction.metricValues.filter((mv) =>
    path === "commercial" ? mv.metricDef.pathCommercial : mv.metricDef.pathResidential
  );

  const metrics: MetricValueRow[] = pathFilteredValues.map((mv) => ({
    key: mv.metricDef.key,
    valueNumeric: mv.valueNumeric,
    valueText: mv.valueText,
    unit: mv.metricDef.unit,
  }));

  const regulatory = computeRegulatoryIntensity(metrics);
  const predictability = computePredictability(metrics);
  const fiscal = computeFiscalBurden(metrics);
  const transparency = computeTransparencyGrade(metrics);

  const lastVerified = jurisdiction.lastVerified ?? jurisdiction.metricValues[0]?.lastVerified ?? null;
  const staleness = getStalenessBadge(lastVerified);

  const summaryLines = [
    regulatory.score > 70
      ? "Higher regulatory friction. Expect multiple inspections and longer processing times."
      : regulatory.score > 40
        ? "Moderate regulatory friction. Expect multiple inspections and average processing times."
        : "Lower regulatory friction. Fewer approval gates and faster processing.",
    predictability.score > 70
      ? "High development predictability. Consistent approval patterns."
      : predictability.score > 40
        ? "Moderate predictability. Some variance in approval outcomes."
        : "Lower predictability. More ordinance changes and potential for delays.",
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
          {jurisdiction.county} County, {jurisdiction.state}
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
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">Methodology</h2>
        <MethodologyPanel />
      </section>
    </div>
  );
}
