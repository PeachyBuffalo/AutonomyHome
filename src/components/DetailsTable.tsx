import { getStalenessBadge } from "@/lib/scoring";

type MetricValue = {
  id: string;
  valueNumeric: number | null;
  valueText: string | null;
  lastVerified: Date | null;
  metricDef: {
    key: string;
    label: string;
    unit: string | null;
    pathResidential: boolean;
    pathCommercial: boolean;
  };
  citations: Array<{
    id: string;
    citationLabel: string | null;
    source: { url: string; title: string | null };
  }>;
};

export function DetailsTable({
  metricValues,
  path,
}: {
  metricValues: MetricValue[];
  path: "residential" | "commercial";
}) {
  const filtered = metricValues.filter((mv) =>
    path === "commercial" ? mv.metricDef.pathCommercial : mv.metricDef.pathResidential
  );

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200">
      <table className="min-w-full divide-y divide-stone-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-stone-700">
              Metric
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-stone-700">
              Value
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-stone-700">
              Citation
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-stone-700">
              Last verified
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {filtered.map((mv) => {
            const badge = getStalenessBadge(mv.lastVerified);
            const displayValue =
              mv.valueNumeric !== null
                ? mv.metricDef.unit === "percent"
                  ? `${mv.valueNumeric}%`
                  : mv.metricDef.unit === "days"
                    ? `${mv.valueNumeric} days`
                    : mv.metricDef.unit === "mills"
                      ? mv.valueNumeric
                      : mv.metricDef.unit === "boolean"
                        ? mv.valueNumeric ? "Yes" : "No"
                        : mv.valueNumeric
                : mv.valueText ?? "—";

            return (
              <tr key={mv.id} className="bg-white">
                <td className="px-4 py-3 text-sm text-stone-800">
                  {mv.metricDef.label}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                  {displayValue}
                </td>
                <td className="px-4 py-3 text-sm">
                  {mv.citations.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {mv.citations.map((c) => (
                        <a
                          key={c.id}
                          href={c.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {c.citationLabel ?? "[?]"}
                        </a>
                      ))}
                    </span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs text-white ${badge.color}`}
                  >
                    {mv.lastVerified
                      ? new Date(mv.lastVerified).toLocaleDateString()
                      : "Unknown"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
