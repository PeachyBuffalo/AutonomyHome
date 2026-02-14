import Link from "next/link";

export default function MethodologyPage() {
  const dimensions = [
    {
      slug: "regulatory_intensity",
      name: "Regulatory Intensity",
      desc: "Volume and complexity of permits, inspections, and approvals required.",
    },
    {
      slug: "buildability",
      name: "Buildability (Residential)",
      desc: "Ease of obtaining residential permits; friction and cost.",
    },
    {
      slug: "development_complexity",
      name: "Development Complexity (Commercial)",
      desc: "Number of approval gates, rezoning risk, site plan review complexity.",
    },
    {
      slug: "tax_burden",
      name: "Tax Burden",
      desc: "Property and development-related taxes.",
    },
    {
      slug: "transparency",
      name: "Transparency",
      desc: "Availability of fee schedules, timelines, and requirements online.",
    },
    {
      slug: "predictability",
      name: "Predictability / Discretion Level",
      desc: "Consistency of outcomes; variance and rezoning approval rates.",
    },
  ];

  const metrics = [
    { name: "Variance approval rate", unit: "%", path: "Both" },
    { name: "Rezoning approval rate", unit: "%", path: "Commercial" },
    { name: "Permit processing timeline", unit: "days", path: "Residential" },
    { name: "Permit cost formula", unit: "formula", path: "Residential" },
    { name: "Infrastructure spending per capita", unit: "$", path: "Both" },
    { name: "Zoning-related lawsuits (count)", unit: "count", path: "Commercial" },
  ];

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
          We publish our methodology so you can assess the data yourself. No
          single ideological score—only measurable indicators and dimension
          profiles.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Dimensions (0–100)
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Category scores are derived from raw metrics. Different buyers prefer
          different profiles. We do not judge—we reveal.
        </p>
        <ul className="mt-4 space-y-4">
          {dimensions.map((d) => (
            <li
              key={d.slug}
              className="rounded-lg border border-stone-200 bg-white p-4"
            >
              <h3 className="font-medium text-stone-900">{d.name}</h3>
              <p className="mt-1 text-sm text-stone-600">{d.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-800">
          Raw Metrics (Measurable Indicators)
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          We collect data, not opinions. Users infer. This reduces legal exposure
          and increases credibility.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-stone-700">
                  Metric
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-stone-700">
                  Unit
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-stone-700">
                  Path
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {metrics.map((m) => (
                <tr key={m.name}>
                  <td className="px-4 py-2 text-sm text-stone-800">{m.name}</td>
                  <td className="px-4 py-2 text-sm text-stone-600">{m.unit}</td>
                  <td className="px-4 py-2 text-sm text-stone-600">{m.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-stone-50 p-6">
        <h2 className="text-lg font-semibold text-stone-800">
          What we avoid
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-stone-700">
          <li>Political framing (e.g., &quot;Freedom&quot; vs &quot;Red Tape&quot;)</li>
          <li>Emotional or advocacy labels</li>
          <li>Opinion-based claims</li>
          <li>Single composite scores without raw data beneath</li>
        </ul>
      </section>

      <Link href="/" className="block text-sm font-medium text-stone-600 hover:text-stone-900">
        ← Back to directory
      </Link>
    </div>
  );
}
