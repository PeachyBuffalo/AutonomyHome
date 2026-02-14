# Real Data Collection Plan

A phased plan for replacing placeholder data with verified, cited metrics for Municipal Governance & Buildability.

**Implementation status (2025-02-14):**
- Phase 1 (Transparency): Partially complete — Holland, Olive verified; Georgetown TBD
- Phase 2 (Fiscal): Holland millage verified (31.98); Olive, Georgetown TBD
- Phase 3 (Regulatory): Ottawa County septic/well fees + Olive Township trade fees verified
- Phase 4 (Predictability): Pending manual research (planning minutes, court records)

---

## 1. Overview

**Goal:** Replace all placeholder metric values with real data from official sources, with proper citations and verification dates.

**Scope:** Start with Holland, Olive, and Georgetown townships (Ottawa County, MI). Expand to Park and Zeeland townships, then other counties.

---

## 2. Metric Inventory & Data Sources

### 2.1 Transparency Metrics (Easiest — Start Here)

| Metric | Source | How to Collect |
|--------|--------|----------------|
| `fee_schedule_online` | Township website | Visit building dept page; 1 if PDF/web fee schedule exists, 0 otherwise |
| `zoning_map_online` | Township website | Check zoning/planning pages for interactive or PDF map |
| `minutes_searchable` | Township website | Check if board/planning minutes are PDFs with search or indexed |
| `permit_portal` | Township website | Look for online permit application (e.g., Accela, Viewpoint) |
| `clear_checklists` | Township website | Check for permit application checklists or step-by-step guides |

**Effort:** ~30 min per jurisdiction. Manual web audit.

---

### 2.2 Fiscal Metrics (Moderate)

| Metric | Source | How to Collect |
|--------|--------|----------------|
| `millage_rate` | County equalization / treasurer | Ottawa: [miottawa.org/Equalization/taxrates.htm](https://www.miottawa.org/Equalization/taxrates.htm). Sum township + county + school + special for a sample parcel |
| `special_assessments_present` | Township budget, meeting minutes | Check for special assessment districts (SADs), road assessments, etc. |
| `debt_per_capita` | Township CAFR / budget | Annual financial report; total debt ÷ population |

**Effort:** ~1–2 hrs per jurisdiction. May require FOIA for some documents.

---

### 2.3 Regulatory Intensity Metrics (Moderate)

| Metric | Source | How to Collect |
|--------|--------|----------------|
| `required_permits_count` | Building dept, zoning ordinance | Count permits for typical new SFH: building, electrical, plumbing, mechanical, septic, well, zoning, driveway |
| `required_inspections_count` | Building dept, fee schedule | Count inspections listed (footing, rough, final, etc.) |
| `approval_gates_count` | Zoning ordinance, process docs | Count: zoning approval, building permit, health dept (septic/well), road commission |
| `avg_permit_processing_days` | Building dept, FOIA | Ask for average turnaround; some publish. Otherwise FOIA permit logs |
| `permit_cost_burden` | Fee schedules | Sum permit fees for typical SFH; normalize to 0–100 vs county median |

**Effort:** ~2–3 hrs per jurisdiction. Fee schedules are usually public; processing times may need FOIA.

---

### 2.4 Predictability Metrics (Hardest)

| Metric | Source | How to Collect |
|--------|--------|----------------|
| `variance_approval_rate_5yr` | Planning commission minutes | Count variance applications approved vs denied over 5 years |
| `rezoning_approval_rate` | Planning commission / board minutes | Count rezoning applications approved vs denied |
| `zoning_amendments_10yr` | Zoning ordinance history | Count ordinance amendments over 10 years |
| `zoning_litigation_10yr` | Court records | Search [courts.michigan.gov](https://www.courts.michigan.gov) for zoning-related cases |

**Effort:** ~4–8 hrs per jurisdiction. Requires reading minutes, ordinance history, and court searches.

---

## 3. Phased Rollout

### Phase 1: Transparency (Week 1)

- [ ] Audit Holland, Olive, Georgetown for all 5 transparency metrics
- [ ] Create/update `Source` records with real URLs
- [ ] Update `MetricValue` with 0/1 and `lastVerified`
- [ ] Add `Citation` linking each value to the source URL

**Deliverable:** All transparency metrics real and cited.

---

### Phase 2: Fiscal (Week 2)

- [ ] Collect millage for each township from Ottawa County equalization
- [ ] Check for special assessments (budget, minutes)
- [ ] Obtain debt per capita from CAFR or budget (may need FOIA)
- [ ] Add citations for each fiscal metric

**Deliverable:** All fiscal metrics real and cited.

---

### Phase 3: Regulatory Intensity (Weeks 3–4)

- [ ] Parse fee schedules; populate `FeeItem` for building, electrical, plumbing, septic, well
- [ ] Count required permits and inspections from ordinance + fee schedule
- [ ] Count approval gates from process documentation
- [ ] Request or estimate permit processing days (FOIA if needed)
- [ ] Compute `permit_cost_burden` from fee totals

**Deliverable:** Regulatory metrics real; fee catalog populated.

---

### Phase 4: Predictability (Weeks 5–8)

- [ ] Holland: Extract variance/rezoning counts from planning minutes (2019–2024)
- [ ] Holland: Count zoning amendments from ordinance history
- [ ] Holland: Search court records for zoning litigation
- [ ] Repeat for Olive, Georgetown

**Deliverable:** Predictability metrics real and cited.

---

## 4. Collection Workflow

### 4.1 Research Template (per jurisdiction)

Create a spreadsheet or markdown file per jurisdiction:

```
## Holland Charter Township
- Last audit: YYYY-MM-DD
- Auditor: [name]

### Transparency
| Metric | Value | Source URL | Locator |
|-------|-------|------------|---------|
| fee_schedule_online | 1 | https://... | Building dept page |
| ... | | | |

### Fiscal
...

### Regulatory
...

### Predictability
...
```

### 4.2 Data Entry Options

1. **Manual seed update:** Edit `prisma/seed.ts` with real values and re-run `npm run db:seed` (with upsert logic).
2. **Prisma Studio:** Use `npx prisma studio` to edit `MetricValue` and `Citation` directly.
3. **Admin UI (future):** Build `/admin` with forms for researchers to enter and cite data.

### 4.3 Citation Standards

- Every `MetricValue` should have at least one `Citation` linking to a `Source`.
- `Source.url` must be a stable, official URL (prefer direct links to PDFs or specific pages).
- `Citation.locatorText` should specify where in the source (e.g., "p.3 fee schedule", "Board minutes 2024-03-15").

---

## 5. Quality & Verification

- **lastVerified:** Set to the date the researcher confirmed the value.
- **confidence (optional):** Use 0–1 for uncertain values (e.g., estimated processing days).
- **notes:** Use for methodology (e.g., "5-year average from planning minutes 2019–2024").
- **Staleness:** Re-verify annually; flag values >365 days old in UI.

---

## 6. Jurisdiction Expansion

After Holland, Olive, Georgetown are fully real:

1. **Park Township, Zeeland Township** (Ottawa County)
2. **Allegan County townships** (reuse Ottawa County health dept patterns)
3. **Other Michigan counties** (expand methodically)

---

## 7. Tooling

| Tool | Purpose |
|------|---------|
| `npm run data:coverage` | Report metric gaps per jurisdiction (residential + commercial) |
| `npm run data:import` | Import from `data/collected-data.json` |
| Research checklist | Markdown template in `docs/research/` per jurisdiction |
| FOIA template | Standard request for permit logs, processing times |
| Admin UI (future) | CRUD for MetricValue, Source, Citation with audit log |

---

## 8. Success Criteria

- [ ] Zero placeholder values for Holland, Olive, Georgetown
- [ ] Every metric has ≥1 citation to an official source
- [ ] `lastVerified` within 180 days for all metrics
- [ ] Fee catalog (`FeeItem`) populated for building, septic, well where applicable
