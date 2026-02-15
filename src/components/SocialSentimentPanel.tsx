type SocialMention = {
  id: string;
  platform: string;
  sourceType: string;
  authorHandle: string | null;
  postUrl: string;
  postText: string;
  postedAt: Date;
  sentimentLabel: string;
  sentimentScore: number;
};

function labelColor(label: string): string {
  if (label === "POSITIVE") return "bg-green-100 text-green-800";
  if (label === "NEGATIVE") return "bg-red-100 text-red-800";
  return "bg-stone-100 text-stone-700";
}

function clampText(text: string, maxLength = 180): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

export function SocialSentimentPanel({
  mentions,
  windowDays = 90,
}: {
  mentions: SocialMention[];
  windowDays?: number;
}) {
  if (mentions.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-800">Social Sentiment ({windowDays}-day)</h3>
        <p className="mt-2 text-sm text-stone-500">No social mentions collected in this window.</p>
      </div>
    );
  }

  const total = mentions.length;
  const positives = mentions.filter((m) => m.sentimentLabel === "POSITIVE").length;
  const neutrals = mentions.filter((m) => m.sentimentLabel === "NEUTRAL").length;
  const negatives = mentions.filter((m) => m.sentimentLabel === "NEGATIVE").length;
  const avg = mentions.reduce((sum, mention) => sum + mention.sentimentScore, 0) / total;
  const normalized = Math.round((((avg + 1) / 2) * 100) * 10) / 10;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-stone-800">Social Sentiment ({windowDays}-day)</h3>
      <div className="mt-2 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
        <p>Mentions analyzed: <span className="font-medium text-stone-800">{total}</span></p>
        <p>Sentiment score: <span className="font-medium text-stone-800">{normalized}</span> / 100</p>
        <p>Positive: <span className="font-medium text-stone-800">{positives}</span></p>
        <p>Neutral: <span className="font-medium text-stone-800">{neutrals}</span> · Negative: <span className="font-medium text-stone-800">{negatives}</span></p>
      </div>

      <div className="mt-3 space-y-2">
        {mentions.slice(0, 6).map((mention) => (
          <div key={mention.id} className="rounded border border-stone-200 bg-stone-50 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="uppercase">{mention.platform}</span>
              <span className={`rounded px-1.5 py-0.5 font-medium ${labelColor(mention.sentimentLabel)}`}>
                {mention.sentimentLabel.toLowerCase()}
              </span>
              <span>{new Date(mention.postedAt).toLocaleDateString()}</span>
              {mention.authorHandle && <span>@{mention.authorHandle}</span>}
              <span>{mention.sourceType === "OFFICIAL_PAGE" ? "official page" : "public mention"}</span>
            </div>
            <p className="mt-1 text-sm text-stone-700">{clampText(mention.postText)}</p>
            <a
              href={mention.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-blue-600 hover:underline"
            >
              View post
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
