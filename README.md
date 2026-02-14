# Municipal Governance & Buildability

Zillow-style Snapshot + Moody's-style Details for property development due diligence in Michigan.

## Overview

- **Snapshot (Zillow-style):** Visual, simple, color-coded scores. Regulatory Intensity, Development Predictability, Fiscal Burden, Administrative Transparency.
- **Details (Moody's-style):** Structured analytics with footnotes, citations, methodology.
- **Two paths:** Residential (buildability, permits, friction) and Commercial (zoning, approval complexity, litigation, tax).

## Quick Start

```bash
npm install
npm run db:push    # Create SQLite DB
npm run db:seed    # Seed Holland, Olive, Georgetown
npm run dev        # http://localhost:3000
```

## Routes

- `/` — Search + featured municipalities
- `/m/:slug` — Municipality profile (Snapshot + Details + Sources + Methodology)
- `/methodology` — Full scoring methodology
- `/calculator` — Fee calculator (illustrative)

## Seed Data

- **Holland Charter Township** — Verified: millage (31.98), transparency (fee schedule, no portal), permit counts. Real URLs (hct.holland.mi.us).
- **Olive Township** — Verified: fee schedule (electrical, mechanical, plumbing), transparency. Real fee amounts.
- **Georgetown Township** — Verified: URLs (gtwp.com), zoning fees. Uses PCI for building.
- **Ottawa County** — Verified: septic ($535), well ($445), soil eval ($400) from county health.

See [docs/DATA_COLLECTION_PLAN.md](docs/DATA_COLLECTION_PLAN.md) for the full data collection plan. Research templates in `docs/research/`.

## Schema

- `Jurisdiction` — name, slug, type, county, state
- `MetricDef` — key, label, unit, path (residential/commercial)
- `MetricValue` — jurisdiction, metric, value, last_verified
- `Source` — url, title, publisher
- `Citation` — links metric values to sources with labels [1], [2], etc.

## Scoring

- **Regulatory Intensity (0–100):** permit cost, permits count, inspections, approval gates, processing days
- **Development Predictability (0–100):** variance rate, rezoning rate, amendments, litigation
- **Fiscal Burden (0–100):** millage, special assessments, debt per capita
- **Administrative Transparency (A+–F):** fee schedule, zoning map, minutes, portal, checklists
