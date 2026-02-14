type MetricValue = {
  citations: Array<{
    source: {
      id: string;
      url: string;
      title: string | null;
      publisher: string | null;
      retrievedDate: Date;
    };
    citationLabel: string | null;
  }>;
};

export function SourcesPanel({ metricValues }: { metricValues: MetricValue[] }) {
  const sourceMap = new Map<
    string,
    { url: string; title: string | null; publisher: string | null; retrievedDate: Date; labels: string[] }
  >();

  for (const mv of metricValues) {
    for (const c of mv.citations) {
      const s = c.source;
      const existing = sourceMap.get(s.id);
      if (existing) {
        if (c.citationLabel && !existing.labels.includes(c.citationLabel)) {
          existing.labels.push(c.citationLabel);
        }
      } else {
        sourceMap.set(s.id, {
          url: s.url,
          title: s.title,
          publisher: s.publisher,
          retrievedDate: s.retrievedDate,
          labels: c.citationLabel ? [c.citationLabel] : [],
        });
      }
    }
  }

  const sources = Array.from(sourceMap.values());

  return (
    <div className="mt-4 space-y-3">
      {sources.length === 0 ? (
        <p className="text-sm text-stone-500">No sources linked yet.</p>
      ) : (
        sources.map((s, i) => (
          <div
            key={i}
            className="rounded-lg border border-stone-200 bg-white p-3 text-sm"
          >
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              {s.title ?? s.url}
            </a>
            {s.publisher && (
              <p className="mt-0.5 text-stone-500">{s.publisher}</p>
            )}
            <p className="mt-1 text-xs text-stone-400">
              Retrieved: {new Date(s.retrievedDate).toLocaleDateString()}
            </p>
            {s.labels.length > 0 && (
              <p className="mt-1 text-xs text-stone-500">
                Citations: {s.labels.join(", ")}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
