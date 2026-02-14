"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Jurisdiction = {
  id: string;
  name: string;
  slug: string;
  type: string;
  county: string | null;
};

export function SearchForm({
  jurisdictions,
}: {
  jurisdictions: Jurisdiction[];
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? jurisdictions.filter(
        (j) =>
          j.name.toLowerCase().includes(query.toLowerCase()) ||
          (j.county?.toLowerCase().includes(query.toLowerCase())) ||
          j.type.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (slug: string) => {
    router.push(`/m/${slug}`);
    setQuery("");
    setFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focused || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(filtered[highlighted].slug);
    }
  };

  return (
    <div ref={ref} className="relative">
      <label htmlFor="search" className="sr-only">
        Search municipalities
      </label>
      <input
        id="search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search by township, city, or county..."
        className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
      />
      {focused && filtered.length > 0 && (
        <ul
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.slice(0, 10).map((j, i) => (
            <li
              key={j.id}
              role="option"
              aria-selected={i === highlighted}
              className={`cursor-pointer px-4 py-2 ${
                i === highlighted ? "bg-stone-100" : ""
              }`}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(j.slug);
              }}
            >
              <span className="font-medium">{j.name}</span>
              <span className="ml-2 text-sm text-stone-500">
                {j.type}
                {j.county && ` · ${j.county}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
