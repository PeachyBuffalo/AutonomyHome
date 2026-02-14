"use client";

import { useState } from "react";
import Link from "next/link";

export default function CalculatorPage() {
  const [heatedSqft, setHeatedSqft] = useState("");
  const [garageSqft, setGarageSqft] = useState("");
  const [basementSqft, setBasementSqft] = useState("");
  const [projectValue, setProjectValue] = useState("");
  const [costPerSqft, setCostPerSqft] = useState("150");

  const h = parseFloat(heatedSqft) || 0;
  const g = parseFloat(garageSqft) || 0;
  const b = parseFloat(basementSqft) || 0;
  const val = parseFloat(projectValue) || 0;
  const cps = parseFloat(costPerSqft) || 150;

  const totalSqft = h + g + b;
  const estimatedValue = val > 0 ? val : totalSqft * cps;

  // Example formula (Garfield Twp style): many jurisdictions use $X per $1,000 valuation
  // e.g. $15 per $1,000 valuation = (value/1000)*15
  const perThousandRate = 15; // placeholder - varies by jurisdiction
  const estimatedBuildingPermit = (estimatedValue / 1000) * perThousandRate;
  const planReview = estimatedBuildingPermit * 0.5; // often 50% of permit
  const coFee = 75; // placeholder CO fee

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back to directory
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          Estimated Cost Calculator
        </h1>
        <p className="mt-2 text-stone-600">
          Many jurisdictions charge building permit fees by project value or
          square footage. This is a rough estimate only—always verify with your
          township/city.
        </p>
      </header>

      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Disclaimer:</strong> This calculator is illustrative only. Fees
        vary by jurisdiction. Formulas differ (e.g., Garfield Twp uses a
        multiplier; others use flat rates). Always check the official fee
        schedule for your township/county.
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-800">Project Inputs</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="heated" className="block text-sm font-medium text-stone-700">
              Heated sq ft
            </label>
            <input
              id="heated"
              type="number"
              value={heatedSqft}
              onChange={(e) => setHeatedSqft(e.target.value)}
              placeholder="2000"
              className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label htmlFor="garage" className="block text-sm font-medium text-stone-700">
              Garage sq ft
            </label>
            <input
              id="garage"
              type="number"
              value={garageSqft}
              onChange={(e) => setGarageSqft(e.target.value)}
              placeholder="400"
              className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label htmlFor="basement" className="block text-sm font-medium text-stone-700">
              Basement sq ft
            </label>
            <input
              id="basement"
              type="number"
              value={basementSqft}
              onChange={(e) => setBasementSqft(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-stone-700">
              Project value ($) — optional
            </label>
            <input
              id="value"
              type="number"
              value={projectValue}
              onChange={(e) => setProjectValue(e.target.value)}
              placeholder="Auto from sq ft"
              className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label htmlFor="costPerSqft" className="block text-sm font-medium text-stone-700">
              Cost per sq ft (if no value)
            </label>
            <input
              id="costPerSqft"
              type="number"
              value={costPerSqft}
              onChange={(e) => setCostPerSqft(e.target.value)}
              className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-800">
          Sample Estimate (Building Permit Only)
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Using a typical &quot;$15 per $1,000 valuation&quot; formula. Your
          jurisdiction may differ.
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-stone-600">Estimated project value</span>
            <span className="font-medium">
              ${estimatedValue.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-600">Building permit (example)</span>
            <span className="font-medium">
              ${Math.round(estimatedBuildingPermit).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-600">Plan review (example)</span>
            <span className="font-medium">
              ${Math.round(planReview).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-600">Certificate of Occupancy (example)</span>
            <span className="font-medium">${coFee}</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-stone-200 pt-4 font-semibold">
            <span>Subtotal (building only)</span>
            <span>
              $
              {(
                estimatedBuildingPermit +
                planReview +
                coFee
              ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
        <p className="mt-4 text-sm text-stone-500">
          Add septic, well, soil eval, electrical, plumbing, mechanical from
          your county/township fee schedules.
        </p>
      </section>

      <Link
        href="/"
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        View Ottawa County fee schedules →
      </Link>
    </div>
  );
}
