import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchForm } from "@/components/SearchForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      county: true,
      lastVerified: true,
    },
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-stone-900">
          Municipal Governance & Buildability
        </h1>
        <p className="mt-2 text-stone-600">
          Understand governance, permitting, tax, and predictability before
          buying property in Michigan.
        </p>
      </section>

      <SearchForm jurisdictions={jurisdictions} />

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-stone-500">Filters:</span>
        <button
          type="button"
          className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-600 hover:bg-stone-100"
        >
          Low Red Tape
        </button>
        <button
          type="button"
          className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-600 hover:bg-stone-100"
        >
          High Predictability
        </button>
        <button
          type="button"
          className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-600 hover:bg-stone-100"
        >
          Low Taxes
        </button>
        <button
          type="button"
          className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-600 hover:bg-stone-100"
        >
          High Privacy Protections
        </button>
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <strong>Disclaimer:</strong> Informational only. Always verify with the
        jurisdiction. We do not provide legal or professional advice.
      </div>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Featured municipalities
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jurisdictions.map((j) => (
            <Link
              key={j.id}
              href={`/m/${j.slug}`}
              className="group rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300 hover:shadow"
            >
              <h3 className="font-semibold text-stone-900 group-hover:text-stone-700">
                {j.name}
              </h3>
              <p className="mt-1 text-sm capitalize text-stone-500">
                {j.type}
                {j.county && ` · ${j.county} County`}
              </p>
              <span className="mt-3 block text-sm font-medium text-stone-600 group-hover:text-stone-800">
                View profile →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-4">
        <Link
          href="/methodology"
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          Methodology →
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
