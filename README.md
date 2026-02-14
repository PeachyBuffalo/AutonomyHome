# AutonomyHome

**Pre-Purchase Governance Intelligence Platform** — neutral, data-driven decision-support for property development in Michigan.

## Positioning

- **Not** a rating system or advocacy platform
- **Is** an investor/due diligence tool with measurable indicators
- Two paths: **Residential** (permits, friction, cost, predictability) and **Commercial** (approval gates, rezoning risk, litigation, tax)
- Dimensions: Regulatory Intensity, Buildability, Development Complexity, Tax Burden, Transparency, Predictability
- Raw metrics + published methodology; users infer

## Launch Scope

- **1 county:** Ottawa County
- **5 municipalities:** Georgetown, Holland, Olive, Park, Zeeland (Ottawa County townships)
- Manual research; expansion deliberate

## Quick Start

```bash
npm install
npm run db:push    # Create SQLite DB
npm run db:seed    # Seed Ottawa + 5 municipalities
npm run dev        # Start at http://localhost:3000
```

## Features

- **Path selection** — Residential vs Commercial
- **Governance profiles** — Dimension scores (0–100) + raw metrics
- **Measurable indicators** — Permit cost formulas, processing days, variance/rezoning rates (when available)
- **Official links** — Fee schedules, health dept, building dept
- **Methodology page** — Published scoring approach
- **Fee calculator** — Illustrative only
- **Legal disclaimers** — Decision-support; verify with jurisdiction

## Data Model

- `Jurisdiction` — township/city/county, contact, links
- `GovernanceMetric` — raw indicators (path, metricType, value, sourceUrl)
- `GovernanceDimension` — dimension scores (path, dimension, score, methodologyNote)
- `FeeItem`, `PermitType`, `SourceDoc` — permit/fee catalog

## Adding Jurisdictions

Edit `prisma/seed.ts` and add to `JURISDICTIONS`, then run `npm run db:seed`. Or use `npx prisma studio`.
