import Link from "next/link";

export function MethodologyPanel() {
  return (
    <div className="mt-4 space-y-6 rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-700">
      <div>
        <h3 className="font-medium text-stone-900">
          Regulatory Intensity (0-100)
        </h3>
        <p className="mt-1">
          Weighted sum of permit cost burden, required permits, required inspections,
          approval gates, and processing days. Higher means more friction.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-stone-900">
          Development Predictability (0-100)
        </h3>
        <p className="mt-1">
          Weighted sum of variance approvals, rezoning approvals, amendment frequency,
          and zoning litigation. Higher means more predictable outcomes.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-stone-900">Fiscal Burden (0-100)</h3>
        <p className="mt-1">
          Weighted sum of millage rate, special assessments, and debt per capita.
          Higher means a more costly environment.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-stone-900">
          Administrative Transparency (A- to F)
        </h3>
        <p className="mt-1">
          Rubric across five binary checks: fee schedule, zoning map, searchable minutes,
          permit portal, and clear checklists.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-stone-900">Data Quality Rules</h3>
        <p className="mt-1">
          Scores use only metrics with status MEASURED or DERIVED. UNKNOWN,
          NOT_APPLICABLE, and FAILED rows are excluded. If a component has under 60%
          usable coverage, the score is shown as unavailable.
        </p>
      </div>

      <Link
        href="/methodology"
        className="inline-block text-blue-600 hover:underline"
      >
        Full methodology →
      </Link>
    </div>
  );
}
