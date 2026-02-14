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

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const j = await prisma.jurisdiction.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!j) return { title: "Jurisdiction" };
  return { title: `${j.name} | Pre-Purchase Governance Profile` };
}

const PERMIT_CHECKLIST = [
  { slug: "zoning", name: "Zoning / Land Use", category: "planning" },
  { slug: "building", name: "Building Permit", category: "building" },
  { slug: "plan_review", name: "Plan Review", category: "building" },
  { slug: "electrical", name: "Electrical", category: "trade" },
  { slug: "plumbing", name: "Plumbing", category: "trade" },
  { slug: "mechanical", name: "Mechanical", category: "trade" },
  { slug: "septic", name: "Septic", category: "environmental" },
  { slug: "well", name: "Well", category: "environmental" },
  { slug: "soil_eval", name: "Soil / Site Evaluation", category: "environmental" },
  { slug: "driveway", name: "Driveway (Road Commission)", category: "planning" },
  { slug: "certificate_of_occupancy", name: "Certificate of Occupancy", category: "building" },
];

const DIMENSION_LABELS: Record<string, string> = {
  regulatory_intensity: "Regulatory Intensity",
  predictability: "Development Predictability",
  fiscal_burden: "Fiscal Burden",
  transparency: "Administrative Transparency",
};

export default async function JurisdictionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { id } = await params;
  const { path: pathParam } = await searchParams;
  const path = pathParam === "commercial" ? "commercial" : "residential";

  const jurisdiction = await prisma.jurisdiction.findUnique({
    where: { id },
    include: {
      feeItems: { include: { permitType: true } },
      sourceDocs: true,
      metricValues: {
        where: {
          metricDef: path === "commercial"
            ? { pathCommercial: true }
            : { pathResidential: true },
        },
        include: { metricDef: true },
      },
    },
  });

  if (!jurisdiction) notFound();

  const metrics: MetricValueRow[] = jurisdiction.metricValues.map((mv) => ({
    key: mv.metricDef.key,
    valueNumeric: mv.valueNumeric,
    valueText: mv.valueText,
    unit: mv.metricDef.unit,
  }));

  const regulatory = computeRegulatoryIntensity(metrics);
  const predictability = computePredictability(metrics);
  const fiscal = computeFiscalBurden(metrics);
  const transparency = computeTransparencyGrade(metrics);

  const dimensionScores: { dimension: string; score: number | string; label: string }[] = [
    { dimension: "regulatory_intensity", score: regulatory.score, label: DIMENSION_LABELS.regulatory_intensity },
    { dimension: "predictability", score: predictability.score, label: DIMENSION_LABELS.predictability },
    { dimension: "fiscal_burden", score: fiscal.score, label: DIMENSION_LABELS.fiscal_burden },
    { dimension: "transparency", score: transparency.grade, label: DIMENSION_LABELS.transparency },
  ];

  const feesByType = jurisdiction.feeItems.reduce(
    (acc, f) => {
      const slug = f.permitType.slug;
      if (!acc[slug]) acc[slug] = [];
      acc[slug].push(f);
      return acc;
    },
    {} as Record<string, typeof jurisdiction.feeItems>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
          ← Back to directory
        </Link>
        {jurisdiction.slug && (
          <Link
            href={`/m/${jurisdiction.slug}?path=${path}`}
            className="text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            View full profile →
          </Link>
        )}
      </div>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          {jurisdiction.name}
        </h1>
        <p className="mt-1 capitalize text-stone-500">
          {jurisdiction.type} · Pre-Purchase Governance Profile
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href={`/jurisdiction/${id}?path=residential`}
            className={`rounded px-3 py-1 text-sm font-medium ${
              path === "residential"
                ? "bg-stone-800 text-white"
                : "bg-stone-200 text-stone-600 hover:bg-stone-300"
            }`}
          >
            Residential
          </Link>
          <Link
            href={`/jurisdiction/${id}?path=commercial`}
            className={`rounded px-3 py-1 text-sm font-medium ${
              path === "commercial"
                ? "bg-stone-800 text-white"
                : "bg-stone-200 text-stone-600 hover:bg-stone-300"
            }`}
          >
            Commercial
          </Link>
        </div>
      </header>

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <strong>Decision-support tool.</strong> Informational only. Always verify
        with the jurisdiction. We do not provide legal advice.
      </div>

      {/* Dimension scores + raw data */}
      {(dimensionScores.length > 0 || jurisdiction.metricValues.length > 0) && (
        <section>
          <h2 className="text-lg font-semibold text-stone-800">
            Governance Profile ({path})
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            <Link href="/methodology" className="text-blue-600 hover:underline">
              Methodology →
            </Link>
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dimensionScores.map((d) => (
              <div
                key={d.dimension}
                className="rounded-lg border border-stone-200 bg-white p-4"
              >
                <h3 className="text-sm font-medium text-stone-700">
                  {d.label}
                </h3>
                <p className="mt-2 text-2xl font-semibold text-stone-900">
                  {typeof d.score === "string" ? d.score : d.score}
                  {typeof d.score === "number" && (
                    <span className="ml-1 text-sm font-normal text-stone-500">
                      / 100
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {jurisdiction.metricValues.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-stone-800">Raw metrics</h3>
              <ul className="mt-2 space-y-2">
                {jurisdiction.metricValues.map((m) => {
                  const badge = getStalenessBadge(m.lastVerified);
                  return (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-stone-200 bg-white px-4 py-3"
                    >
                      <span className="text-stone-700">{m.metricDef.label}</span>
                      <div className="flex items-center gap-2">
                        {m.valueNumeric !== null && (
                          <span className="font-medium">
                            {m.metricDef.unit === "percent"
                              ? `${m.valueNumeric}%`
                              : m.metricDef.unit === "days"
                                ? `${m.valueNumeric} days`
                                : m.metricDef.unit === "dollars"
                                  ? `$${m.valueNumeric}`
                                  : m.valueNumeric}
                          </span>
                        )}
                        {m.valueText && (
                          <span className="text-sm text-stone-600">
                            {m.valueText}
                          </span>
                        )}
                        <span
                          className={`rounded px-2 py-0.5 text-xs text-white ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-stone-500">
                Users infer. We present data, not opinions.
              </p>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Permit Checklist (
          {path === "commercial" ? "Commercial" : "Residential · New SFH"}
          )
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          {path === "commercial"
            ? "Approval gates vary by project type. Check planning/building dept."
            : "Commonly required. Check township/city/building dept for specifics."}
        </p>
        <ul className="mt-4 space-y-2">
          {PERMIT_CHECKLIST.map((p) => {
            const fees = feesByType[p.slug] ?? [];
            const hasData = fees.length > 0;
            return (
              <li
                key={p.slug}
                className="flex items-center gap-3 rounded border border-stone-200 bg-white px-4 py-3"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    hasData ? "bg-green-500" : "bg-stone-300"
                  }`}
                />
                <div className="flex-1">
                  <span className="font-medium">{p.name}</span>
                  {jurisdiction.notes && p.slug === "building" && (
                    <span className="ml-2 text-sm text-stone-500">
                      (township/city level)
                    </span>
                  )}
                </div>
                {hasData && (
                  <span className="text-sm text-stone-500">
                    {fees.length} fee{fees.length > 1 ? "s" : ""} listed
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Fees & Official Links
        </h2>
        <div className="mt-4 space-y-6">
          {jurisdiction.feeItems.length === 0 ? (
            <p className="text-stone-600">
              No fee data yet. Use the links below to find official schedules.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(feesByType).map(([slug, items]) => (
                <div
                  key={slug}
                  className="rounded-lg border border-stone-200 bg-white p-4"
                >
                  <h3 className="font-medium text-stone-800">
                    {items[0]?.permitType.name}
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {items.map((f) => {
                      const badge = getStalenessBadge(f.lastVerifiedDate);
                      return (
                        <li
                          key={f.id}
                          className="flex flex-wrap items-baseline justify-between gap-2"
                        >
                          <div>
                            <span className="text-stone-700">{f.feeName}</span>
                            {f.notes && (
                              <span className="ml-2 text-sm text-stone-500">
                                {f.notes}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {f.amount !== null && (
                              <span className="font-medium">${f.amount}</span>
                            )}
                            {f.formulaText && (
                              <span className="text-sm text-stone-500">
                                {f.formulaText}
                              </span>
                            )}
                            <span
                              className={`rounded px-2 py-0.5 text-xs text-white ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {items[0]?.sourceUrl && (
                    <a
                      href={items[0].sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-sm text-blue-600 hover:underline"
                    >
                      Source →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="font-medium text-stone-800">Official Documents</h3>
            <ul className="mt-2 space-y-1">
              {jurisdiction.sourceDocs.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {doc.documentTitle ?? doc.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">Contact</h2>
        <div className="mt-4 space-y-6 rounded-lg border border-stone-200 bg-white p-4">
          {jurisdiction.website && (
            <div>
              <p className="text-xs text-stone-500">Website</p>
              <a
                href={jurisdiction.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {jurisdiction.website}
              </a>
            </div>
          )}
          {jurisdiction.phone && (
            <div>
              <p className="text-xs text-stone-500">Phone</p>
              <a href={`tel:${jurisdiction.phone}`} className="text-stone-600">
                {jurisdiction.phone}
              </a>
            </div>
          )}
          {jurisdiction.address && (
            <div>
              <p className="text-xs text-stone-500">Address</p>
              <p className="text-stone-600">{jurisdiction.address}</p>
            </div>
          )}
          {jurisdiction.officeHours && (
            <div>
              <p className="text-xs text-stone-500">Hours</p>
              <p className="text-stone-600">{jurisdiction.officeHours}</p>
            </div>
          )}
        </div>
      </section>

      {jurisdiction.notes && (
        <section>
          <h2 className="text-lg font-semibold text-stone-800">Notes</h2>
          <p className="mt-2 text-stone-600">{jurisdiction.notes}</p>
        </section>
      )}

      <Link
        href="/calculator"
        className="inline-block rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
      >
        Fee calculator →
      </Link>
    </div>
  );
}
