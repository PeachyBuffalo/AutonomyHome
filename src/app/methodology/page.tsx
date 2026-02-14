import Link from "next/link";

export default function MethodologyPage() {
  return (
    <div className="space-y-10">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          Scoring Methodology
        </h1>
        <p className="mt-2 text-stone-600">
          Transparent formulas with explicit data status handling and no default-value
          substitution.
        </p>
      </header>

      <section className="space-y-6">
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-800">
            Regulatory Intensity Index (0-100)
          </h2>
          <p className="mt-2 text-stone-600">
            Higher = more regulatory friction. Weighted components:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-600">
            <li>Permit cost burden: 20%</li>
            <li>Required permits count: 15%</li>
            <li>Required inspections: 15%</li>
            <li>Approval gates: 20%</li>
            <li>Average processing days: 15%</li>
          </ul>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-800">
            Development Predictability Index (0-100)
          </h2>
          <p className="mt-2 text-stone-600">
            Higher = more predictable outcomes. Weighted components:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-600">
            <li>Variance approval rate (5-year): 25%</li>
            <li>Rezoning approval rate: 25%</li>
            <li>Zoning amendment frequency: 20%</li>
            <li>Zoning litigation count: 20%</li>
          </ul>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-800">
            Fiscal Burden Score (0-100)
          </h2>
          <p className="mt-2 text-stone-600">
            Higher = more costly tax environment. Weighted components:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-600">
            <li>Millage rate: 50%</li>
            <li>Special assessments: 25%</li>
            <li>Debt per capita: 25%</li>
          </ul>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-800">
            Administrative Transparency (A- to F)
          </h2>
          <p className="mt-2 text-stone-600">
            Each criterion present adds one tier:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-600">
            <li>Fee schedule published online</li>
            <li>Zoning map available online</li>
            <li>Meeting minutes searchable</li>
            <li>Permit application portal</li>
            <li>Clear permit checklists</li>
          </ul>
          <p className="mt-4 text-stone-600">
            5/5 = A-, 4/5 = B+, 3/5 = C, 2/5 = C-, 1/5 = D, 0/5 = F
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-800">
            Data Status and Coverage Rules
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-600">
            <li>Only MEASURED and DERIVED metrics are eligible for scoring.</li>
            <li>UNKNOWN, NOT_APPLICABLE, and FAILED values are excluded.</li>
            <li>If usable coverage is under 60% for a score component, score is unavailable.</li>
            <li>Staleness warnings are based on last verification timestamps.</li>
          </ul>
        </div>
      </section>

      <Link href="/" className="block text-sm font-medium text-stone-600 hover:text-stone-900">
        ← Back to search
      </Link>
    </div>
  );
}
