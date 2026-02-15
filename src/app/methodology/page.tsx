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
          Transparent weights and formulas. All indices are computed from raw
          metrics with published methodology.
        </p>
      </header>

      <section className="space-y-6">
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-800">
            Regulatory Intensity Index (0–100)
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
            <li>Point-of-sale inspection: 15%</li>
          </ul>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-800">
            Development Predictability Index (0–100)
          </h2>
          <p className="mt-2 text-stone-600">
            Higher = more predictable outcomes. Weighted components:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-600">
            <li>Variance approval rate (5-yr): 25%</li>
            <li>Rezoning approval rate: 25%</li>
            <li>Ordinance amendment frequency: 20%</li>
            <li>Litigation count: 20%</li>
            <li>Timeline variance: 10%</li>
          </ul>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-800">
            Fiscal Burden Score (0–100)
          </h2>
          <p className="mt-2 text-stone-600">
            Higher = more costly tax environment. Weighted components:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-600">
            <li>Millage rate vs county median: 50%</li>
            <li>Special assessments: 25%</li>
            <li>Debt per capita: 25%</li>
          </ul>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-800">
            Administrative Transparency (A+ to F)
          </h2>
          <p className="mt-2 text-stone-600">
            Letter grade rubric. Each criterion present adds one tier:
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
            Community Pulse Metrics (90-day)
          </h2>
          <p className="mt-2 text-stone-600">
            Sentiment is collected through provider plugins for X, Facebook, and
            neighborhood sources (Reddit plus optional Nextdoor export), with
            file-based fallback entries. Each post is scored using deterministic
            positive/negative keyword matching.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-600">
            <li>Community sentiment score (90-day): derived, normalized 0-100</li>
            <li>Community sentiment mentions analyzed (90-day): derived count</li>
            <li>Citations link back to the source posts used in the calculation</li>
          </ul>
        </div>
      </section>

      <Link href="/" className="block text-sm font-medium text-stone-600 hover:text-stone-900">
        ← Back to search
      </Link>
    </div>
  );
}
