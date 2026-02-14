import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: { name: "asc" },
    where: { type: { in: ["county", "township", "city"] } },
    include: {
      feeItems: { include: { permitType: true } },
      governanceMetrics: true,
      governanceDimensions: true,
    },
  });

  const counties = jurisdictions.filter((j) => j.type === "county");
  const municipalities = jurisdictions.filter((j) =>
    ["township", "city"].includes(j.type)
  );

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold text-stone-900">
          Pre-Purchase Governance Intelligence
        </h1>
        <p className="mt-2 text-stone-600">
          Data-driven due diligence for property development in Michigan. Permits,
          fees, approval metrics, and transparency—no advocacy, no ratings.
        </p>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-800">
          Choose your path
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Residential and commercial development face different approval gates.
          Select the path that matches your project.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/residential"
            className="group flex flex-col rounded-lg border-2 border-stone-200 p-6 transition hover:border-stone-400 hover:bg-stone-50"
          >
            <span className="text-2xl" aria-hidden>🏡</span>
            <h3 className="mt-2 font-semibold text-stone-900">
              Residential Path
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Can I build what I want? Permits, inspections, friction, cost,
              predictability.
            </p>
            <span className="mt-4 text-sm font-medium text-stone-700 group-hover:text-stone-900">
              Explore residential →
            </span>
          </Link>
          <Link
            href="/commercial"
            className="group flex flex-col rounded-lg border-2 border-stone-200 p-6 transition hover:border-stone-400 hover:bg-stone-50"
          >
            <span className="text-2xl" aria-hidden>🏢</span>
            <h3 className="mt-2 font-semibold text-stone-900">
              Commercial Path
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Approval gates, rezoning risk, site plan complexity, litigation
              history, tax environment.
            </p>
            <span className="mt-4 text-sm font-medium text-stone-700 group-hover:text-stone-900">
              Explore commercial →
            </span>
          </Link>
        </div>
      </section>

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <strong>Disclaimer:</strong> Informational only. Always verify with the
        jurisdiction. We do not provide legal or professional advice. This is a
        decision-support tool, not a protest platform.
      </div>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Launch scope: Ottawa County + 5 municipalities
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Manual research. Methodology published. Expansion deliberate.
        </p>

        {counties.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium uppercase text-stone-500">
              County
            </h3>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {counties.map((j) => (
                <JurisdictionCard key={j.id} jurisdiction={j} />
              ))}
            </div>
          </div>
        )}

        {municipalities.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium uppercase text-stone-500">
              Municipalities
            </h3>
            <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {municipalities.map((j) => (
                <JurisdictionCard key={j.id} jurisdiction={j} compact />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-4">
        <Link
          href="/methodology"
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          Scoring methodology →
        </Link>
        <Link
          href="/calculator"
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          Fee calculator →
        </Link>
      </section>
    </div>
  );
}

function JurisdictionCard({
  jurisdiction,
  compact = false,
}: {
  jurisdiction: {
    id: string;
    name: string;
    type: string;
    county: string | null;
    website: string | null;
    phone: string | null;
    buildingDeptLink: string | null;
    healthDeptLink: string | null;
    feeItems: Array<{
      id: string;
      feeName: string;
      amount: number | null;
      permitType: { name: string };
    }>;
    governanceMetrics: Array<{ path: string }>;
    governanceDimensions: Array<{ path: string; dimension: string; score: number }>;
  };
  compact?: boolean;
}) {
  const hasResidential = jurisdiction.governanceMetrics.some(
    (m) => m.path === "residential"
  ) || jurisdiction.feeItems.length > 0;
  const hasCommercial = jurisdiction.governanceMetrics.some(
    (m) => m.path === "commercial"
  );

  return (
    <article
      className={`rounded-lg border border-stone-200 bg-white shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <h3 className="font-semibold text-stone-900">{jurisdiction.name}</h3>
      <p className="text-sm capitalize text-stone-500">
        {jurisdiction.type}
        {jurisdiction.county && ` · ${jurisdiction.county} County`}
      </p>

      {!compact && (
        <div className="mt-4 space-y-2">
          {jurisdiction.healthDeptLink && (
            <a
              href={jurisdiction.healthDeptLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-blue-600 hover:underline"
            >
              Health Dept →
            </a>
          )}
          {jurisdiction.buildingDeptLink && (
            <a
              href={jurisdiction.buildingDeptLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-blue-600 hover:underline"
            >
              Building / Fee Schedule →
            </a>
          )}
          {jurisdiction.website && (
            <a
              href={jurisdiction.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-blue-600 hover:underline"
            >
              Official Website →
            </a>
          )}
        </div>
      )}

      {jurisdiction.feeItems.length > 0 && !compact && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <p className="text-xs font-medium uppercase text-stone-500">
            Sample fees (verify source)
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {jurisdiction.feeItems.slice(0, 3).map((f) => (
              <li key={f.id} className="flex justify-between">
                <span className="text-stone-600 truncate">{f.feeName}</span>
                {f.amount !== null && (
                  <span className="ml-2 shrink-0 font-medium">${f.amount}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/jurisdiction/${jurisdiction.id}?path=residential`}
          className={`text-sm font-medium ${
            hasResidential ? "text-stone-700 hover:text-stone-900" : "text-stone-400"
          }`}
        >
          Residential
        </Link>
        <span className="text-stone-300">|</span>
        <Link
          href={`/jurisdiction/${jurisdiction.id}?path=commercial`}
          className={`text-sm font-medium ${
            hasCommercial ? "text-stone-700 hover:text-stone-900" : "text-stone-400"
          }`}
        >
          Commercial
        </Link>
      </div>

      <Link
        href={`/jurisdiction/${jurisdiction.id}`}
        className="mt-3 block text-sm font-medium text-stone-700 hover:text-stone-900"
      >
        Governance profile →
      </Link>
    </article>
  );
}
