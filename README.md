# AutonomyHome

Michigan DIY Homebuilder Permit & Fee Directory — required permits and costs by township and county.

## Launch Counties

- **Ottawa County** — Health Dept (septic, well, soil eval), building permits at township level
- **Allegan County** — Environmental Health (septic, well, soil erosion), building permits at township level

## Quick Start

```bash
npm install
npm run db:push    # Create SQLite DB
npm run db:seed    # Seed Ottawa + Allegan data
npm run dev        # Start at http://localhost:3000
```

## Features

- **Official link directory** — Building dept, health dept, fee schedule links per jurisdiction
- **Fee catalog** — Parsed fees with source URLs and last-verified dates
- **Permit checklist** — Zoning → Building → Trades → Septic/Well for new SFH
- **Staleness badges** — Green (&lt;180 days), Yellow (180–365), Red (&gt;365)
- **Cost calculator** — Estimate building permit fees by sq ft / valuation (illustrative)
- **Legal disclaimers** — Informational only; always verify with jurisdiction

## Data Model

- `Jurisdiction` — township/city/county, contact, links
- `PermitType` — building, electrical, plumbing, septic, well, soil_eval, etc.
- `FeeItem` — fee name, amount or formula, units, source URL, last verified
- `SourceDoc` — official PDF/webpage links for trust

## Adding Jurisdictions

Edit `prisma/seed.ts` and add to `JURISDICTIONS`, then run `npm run db:seed`. Or use the Prisma Studio: `npx prisma studio`.
