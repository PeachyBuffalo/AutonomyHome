"use client";

import Link from "next/link";

export function PathToggle({
  slug,
  path,
}: {
  slug: string;
  path: "residential" | "commercial";
}) {
  return (
    <div className="flex gap-2">
      <Link
        href={`/m/${slug}?path=residential`}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          path === "residential"
            ? "bg-stone-800 text-white"
            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
        }`}
      >
        Residential
      </Link>
      <Link
        href={`/m/${slug}?path=commercial`}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          path === "commercial"
            ? "bg-stone-800 text-white"
            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
        }`}
      >
        Commercial
      </Link>
    </div>
  );
}
