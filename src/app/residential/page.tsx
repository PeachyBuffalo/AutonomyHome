import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ResidentialPathPage() {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: { name: "asc" },
    include: {
      feeItems: { include: { permitType: true } },
      governanceMetrics: { where: { path: "residential" } },
      governanceDimensions: { where: { path: "residential" } },
    },
  });

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          Residential Path
        </h1>
        <p className="mt-2 text-stone-600">
          Can I build what I want? Permits, inspections, friction, cost, and
          predictability for residential development.
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
              href={`/jurisdiction/${j.id}?path=residential`}
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300"
            >
              <h3 className="font-semibold text-stone-900">{j.name}</h3>
              <p className="mt-1 text-sm capitalize text-stone-500">{j.type}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-stone-600">
                <span>{j.feeItems.length} fees</span>
                <span>·</span>
                <span>{j.governanceMetrics.length} metrics</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Link
        href="/calculator"
        className="inline-block rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
      >
        Fee calculator →
      </Link>
    </div>
  );
}
