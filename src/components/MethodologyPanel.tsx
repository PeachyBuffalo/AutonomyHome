import Link from "next/link";

export function MethodologyPanel() {
  return (
    <div className="mt-4 space-y-6 rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-700">
      <div>
        <h3 className="font-medium text-stone-900">
          Regulatory Intensity (0–100)
        </h3>
        <p className="mt-1">
          Weighted sum of: permit cost burden (20%), required permits count
          (15%), required inspections (15%), approval gates (20%), average
          processing days (15%), point-of-sale inspection presence (15%).
          Higher = more friction.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-stone-900">
          Development Predictability (0–100)
        </h3>
        <p className="mt-1">
          Weighted sum of: variance approval rate (25%), rezoning approval rate
          (25%), ordinance amendment frequency (20%), litigation count (20%),
          timeline variance (10%). Higher = more predictable.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-stone-900">Fiscal Burden (0–100)</h3>
        <p className="mt-1">
          Weighted sum of: millage rate vs county median (50%), special
          assessments (25%), debt per capita (25%). Higher = more costly.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-stone-900">
          Administrative Transparency (A+ to F)
        </h3>
        <p className="mt-1">
          Rubric: fee schedule online, zoning map online, minutes searchable,
          permit portal, clear checklists. Each present = +1 tier. 5/5 = A-,
          4/5 = B+, 3/5 = C, etc.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-stone-900">
          Social Sentiment (90-day)
        </h3>
        <p className="mt-1">
          Aggregated from official social pages and public mentions tied to the
          jurisdiction. Mentions are scored with a deterministic lexicon model
          and normalized to a 0–100 sentiment score.
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
