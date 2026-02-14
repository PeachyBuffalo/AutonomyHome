"use client";

import { useState } from "react";

function scoreColor(score: number, inverse = false) {
  if (inverse) {
    if (score >= 70) return "bg-red-100 text-red-800";
    if (score >= 40) return "bg-amber-100 text-amber-800";
    return "bg-green-100 text-green-800";
  }
  if (score >= 70) return "bg-green-100 text-green-800";
  if (score >= 40) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "bg-green-100 text-green-800";
  if (grade.startsWith("B")) return "bg-amber-100 text-amber-800";
  if (grade.startsWith("C")) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} of 5 stars data confidence`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= count ? "text-amber-500" : "text-stone-200"}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function SnapshotCards({
  regulatoryScore,
  predictabilityScore,
  fiscalScore,
  transparencyGrade,
  summaryLines,
  regulatoryDrivers,
  predictabilityDrivers,
  fiscalDrivers,
  transparencyDrivers,
  dataConfidenceStars = 0,
  dataQualityNote,
}: {
  regulatoryScore: number | null;
  predictabilityScore: number | null;
  fiscalScore: number | null;
  transparencyGrade: string | null;
  summaryLines: string[];
  regulatoryDrivers: { label: string; contribution: number }[];
  predictabilityDrivers: { label: string; contribution: number }[];
  fiscalDrivers: { label: string; contribution: number }[];
  transparencyDrivers: { label: string; present: boolean; hasData?: boolean }[];
  dataConfidenceStars?: number;
  dataQualityNote?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-800">Snapshot</h2>
        {dataQualityNote != null && (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Stars count={dataConfidenceStars} />
            <span>{dataQualityNote}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-stone-500">
            Regulatory Intensity
          </p>
          <p className={`mt-1 text-2xl font-bold ${regulatoryScore == null ? "text-stone-400" : "text-stone-900"}`}>
            {regulatoryScore != null ? regulatoryScore.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-stone-400">0–100, higher = more friction</p>
          {regulatoryScore != null && (
            <span
              className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${scoreColor(
                regulatoryScore,
                true
              )}`}
            >
              {regulatoryScore >= 70 ? "High" : regulatoryScore >= 40 ? "Moderate" : "Low"}
            </span>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-stone-500">
            Development Predictability
          </p>
          <p className={`mt-1 text-2xl font-bold ${predictabilityScore == null ? "text-stone-400" : "text-stone-900"}`}>
            {predictabilityScore != null ? predictabilityScore.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-stone-400">0–100, higher = more predictable</p>
          {predictabilityScore != null && (
            <span
              className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${scoreColor(
                predictabilityScore
              )}`}
            >
              {predictabilityScore >= 70 ? "High" : predictabilityScore >= 40 ? "Moderate" : "Low"}
            </span>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-stone-500">Fiscal Burden</p>
          <p className={`mt-1 text-2xl font-bold ${fiscalScore == null ? "text-stone-400" : "text-stone-900"}`}>
            {fiscalScore != null ? fiscalScore.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-stone-400">0–100, higher = more costly</p>
          {fiscalScore != null && (
            <span
              className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${scoreColor(
                fiscalScore,
                true
              )}`}
            >
              {fiscalScore >= 70 ? "High" : fiscalScore >= 40 ? "Moderate" : "Low"}
            </span>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-stone-500">
            Administrative Transparency
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {transparencyGrade ?? "—"}
          </p>
          <p className="text-xs text-stone-400">A+ to F</p>
          {transparencyGrade != null && (
            <span
              className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${gradeColor(
                transparencyGrade
              )}`}
            >
              {transparencyGrade}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <p className="text-sm font-medium text-stone-700">At a glance</p>
        <ul className="mt-2 space-y-1 text-sm text-stone-600">
          {summaryLines.map((line, i) => (
            <li key={i}>• {line}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <button
          type="button"
          onClick={() => setExpanded(expanded === "drivers" ? null : "drivers")}
          className="flex w-full items-center justify-between text-left font-medium text-stone-800"
        >
          Why this score?
          <span className="text-stone-500">{expanded === "drivers" ? "−" : "+"}</span>
        </button>
        {expanded === "drivers" && (
          <div className="mt-4 space-y-4 border-t border-stone-100 pt-4">
            <div>
              <p className="text-xs font-medium uppercase text-stone-500">
                Regulatory Intensity (top drivers)
              </p>
              <ul className="mt-1 space-y-1 text-sm text-stone-600">
                {regulatoryDrivers.slice(0, 3).map((d, i) => (
                  <li key={i}>
                    {d.label}: {d.contribution.toFixed(1)} pts
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-stone-500">
                Predictability (top drivers)
              </p>
              <ul className="mt-1 space-y-1 text-sm text-stone-600">
                {predictabilityDrivers.slice(0, 3).map((d, i) => (
                  <li key={i}>
                    {d.label}: {d.contribution.toFixed(1)} pts
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-stone-500">
                Fiscal Burden (top drivers)
              </p>
              <ul className="mt-1 space-y-1 text-sm text-stone-600">
                {fiscalDrivers.slice(0, 3).map((d, i) => (
                  <li key={i}>
                    {d.label}: {d.contribution.toFixed(1)} pts
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-stone-500">
                Transparency (rubric)
              </p>
              <ul className="mt-1 space-y-1 text-sm text-stone-600">
                {transparencyDrivers.map((d, i) => (
                  <li key={i}>
                    {d.hasData === false ? "—" : d.present ? "✓" : "✗"} {d.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
