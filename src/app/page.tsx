import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: { name: "asc" },
    include: {
      feeItems: { include: { permitType: true } },
      sourceDocs: true,
    },
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-stone-900">
          Permit & Fee Directory
        </h1>
        <p className="mt-2 text-stone-600">
          Official links and fee schedules for DIY homebuilders in Michigan.
          Start with your county for septic, well, and soil evaluation; building
          permits are typically issued by your township or city.
        </p>
      </section>

      <div className="rounded-lg border border-stone-200 bg-amber-50/50 p-4 text-sm text-amber-900">
        <strong>Disclaimer:</strong> This site is informational only. Always
        verify with the jurisdiction before applying. Fees and requirements
        change.
      </div>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Counties (Ottawa & Allegan)
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {jurisdictions.map((j) => (
            <JurisdictionCard key={j.id} jurisdiction={j} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Estimated Cost Calculator
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Many jurisdictions charge by valuation or square footage. Use our
          calculator for estimates.
        </p>
        <Link
          href="/calculator"
          className="mt-3 inline-block rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Open Calculator →
        </Link>
      </section>
    </div>
  );
}

function JurisdictionCard({
  jurisdiction,
}: {
  jurisdiction: {
    id: string;
    name: string;
    type: string;
    website: string | null;
    phone: string | null;
    buildingDeptLink: string | null;
    healthDeptLink: string | null;
    address: string | null;
    officeHours: string | null;
    notes: string | null;
    feeItems: Array<{
      id: string;
      feeName: string;
      amount: number | null;
      formulaText: string | null;
      units: string;
      sourceUrl: string | null;
      permitType: { name: string };
    }>;
    sourceDocs: Array<{ url: string; documentTitle: string | null }>;
  };
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-stone-900">{jurisdiction.name}</h3>
      <p className="text-sm capitalize text-stone-500">{jurisdiction.type}</p>

      <div className="mt-4 space-y-2">
        {jurisdiction.healthDeptLink && (
          <a
            href={jurisdiction.healthDeptLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-blue-600 hover:underline"
          >
            Health Dept → Septic, Well, Soil
          </a>
        )}
        {jurisdiction.buildingDeptLink && (
          <a
            href={jurisdiction.buildingDeptLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-blue-600 hover:underline"
          >
            Building / Fee Schedule
          </a>
        )}
        {jurisdiction.website && (
          <a
            href={jurisdiction.website}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-blue-600 hover:underline"
          >
            Official Website
          </a>
        )}
      </div>

      {jurisdiction.phone && (
        <p className="mt-2 text-sm text-stone-600">{jurisdiction.phone}</p>
      )}

      {jurisdiction.feeItems.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <p className="text-xs font-medium uppercase text-stone-500">
            Sample fees (verify source)
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {jurisdiction.feeItems.slice(0, 4).map((f) => (
              <li key={f.id} className="flex justify-between">
                <span className="text-stone-600">{f.feeName}</span>
                {f.amount !== null && (
                  <span className="font-medium">${f.amount}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href={`/jurisdiction/${jurisdiction.id}`}
        className="mt-4 block text-sm font-medium text-stone-700 hover:text-stone-900"
      >
        View full details →
      </Link>
    </article>
  );
}
