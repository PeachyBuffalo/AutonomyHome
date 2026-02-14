import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
  return { title: `${j.name} | AutonomyHome` };
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

function getStalenessBadge(lastVerified: Date | null) {
  if (!lastVerified) return { label: "Unknown", color: "bg-stone-700" };
  const days = Math.floor((Date.now() - lastVerified.getTime()) / 86400000);
  if (days < 180) return { label: "Recent", color: "bg-green-600" };
  if (days < 365) return { label: "Check", color: "bg-amber-600" };
  return { label: "Stale", color: "bg-red-600" };
}

export default async function JurisdictionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jurisdiction = await prisma.jurisdiction.findUnique({
    where: { id },
    include: {
      feeItems: { include: { permitType: true } },
      sourceDocs: true,
    },
  });

  if (!jurisdiction) notFound();

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
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back to directory
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          {jurisdiction.name}
        </h1>
        <p className="mt-1 capitalize text-stone-500">{jurisdiction.type}</p>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Informational only.</strong> Always verify with the jurisdiction
        before applying. Fees and requirements change.
      </div>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Permit Checklist (New SFH)
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Commonly required for new single-family homes. Check your
          township/city/building dept for specifics.
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
                <div key={slug} className="rounded-lg border border-stone-200 bg-white p-4">
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
        Estimate costs →
      </Link>
    </div>
  );
}
