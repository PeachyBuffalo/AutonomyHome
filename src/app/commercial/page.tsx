import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CommercialPathPage() {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: { name: "asc" },
    include: {
      metricValues: {
        where: { metricDef: { pathCommercial: true } },
        include: { metricDef: true },
      },
    },
  });

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          Commercial Path
        </h1>
        <p className="mt-2 text-stone-600">
          Approval gates, rezoning risk, site plan review complexity, litigation
          history, and tax environment for commercial development.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Jurisdictions
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {jurisdictions.map((j) => (
            <Link
              key={j.id}
              href={j.slug ? `/m/${j.slug}?path=commercial` : `/jurisdiction/${j.id}?path=commercial`}
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300"
            >
              <h3 className="font-semibold text-stone-900">{j.name}</h3>
              <p className="mt-1 text-sm capitalize text-stone-500">{j.type}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-stone-600">
                <span>{j.metricValues.length} metrics</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-sm text-stone-500">
        Commercial metrics (rezoning approval rate, zoning lawsuits, etc.) are
        being added. Check back for updates.
      </p>
    </div>
  );
}
