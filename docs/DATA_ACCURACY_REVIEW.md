# Snapshot Rating Accuracy Review

**Date:** 2025-02-14  
**Finding:** Snapshot scores are largely driven by **hardcoded defaults** rather than real data. Most metrics are `null`, so the scoring functions fall back to placeholder values that make all municipalities look similar.

---

## 1. Root Cause: Sparse Data + Aggressive Defaults

When a metric value is `null`, the scoring functions use fixed defaults:

| Scoring Function | Metric | Default When Null | Impact |
|------------------|--------|-------------------|--------|
| Regulatory Intensity | permit_cost_burden | 50 | 20% of score |
| Regulatory Intensity | required_permits_count | 5 | 15% of score |
| Regulatory Intensity | required_inspections_count | 4 | 15% of score |
| Regulatory Intensity | approval_gates_count | 3 | 20% of score |
| Regulatory Intensity | avg_permit_processing_days | 30 | 15% of score |
| Predictability | variance_approval_rate_5yr | 70 | 25% of score |
| Predictability | rezoning_approval_rate | 70 | 25% of score |
| Predictability | zoning_amendments_10yr | 15 | 20% of score |
| Predictability | zoning_litigation_10yr | 2 | 20% of score |
| Fiscal Burden | millage_rate | 35 | 50% of score |
| Fiscal Burden | special_assessments_present | 0 | 25% of score |
| Fiscal Burden | debt_per_capita | 0 | 25% of score |
| Transparency | (any of 5 booleans) | false | 20% each |

**Result:** Holland, Olive, and Georgetown receive nearly identical Regulatory, Predictability, and (for Olive/Georgetown) Fiscal scores because they share the same defaults.

---

## 2. Data Coverage by Municipality

### Holland Charter Township

| Metric | Value | Status | Used in Score? |
|--------|-------|--------|----------------|
| variance_approval_rate_5yr | null | Not gathered | Default 70 |
| rezoning_approval_rate | null | Not gathered | Default 70 |
| avg_permit_processing_days | null | Not gathered | Default 30 |
| millage_rate | **31.98** | ✅ Verified | Real |
| zoning_amendments_10yr | null | Not gathered | Default 15 |
| zoning_litigation_10yr | null | Not gathered | Default 2 |
| required_permits_count | **6** | ✅ Verified | Real |
| required_inspections_count | null | Not gathered | Default 4 |
| approval_gates_count | **3** | ✅ Verified | Real |
| permit_cost_burden | null | Not gathered | Default 50 |
| fee_schedule_online | **1** | ✅ Verified | Real |
| zoning_map_online | null | Not gathered | Default false |
| minutes_searchable | null | Not gathered | Default false |
| permit_portal | **0** | ✅ Verified | Real |
| clear_checklists | null | Not gathered | Default false |
| special_assessments_present | null | Not gathered | Default 0 |
| debt_per_capita | null | Not gathered | Default 0 |

**Real data:** 6 of 17 metrics (35%). **Transparency:** 2/5 → grade D.

---

### Olive Township

| Metric | Value | Status | Used in Score? |
|--------|-------|--------|----------------|
| millage_rate | null | Not gathered | Default 35 |
| All others | Same pattern as Holland | | |

**Real data:** 5 of 17 metrics (29%). **Transparency:** 2/5 → grade D (fee_schedule=1, permit_portal=0).

---

### Georgetown Township

| Metric | Value | Status | Used in Score? |
|--------|-------|--------|----------------|
| required_permits_count | **7** | Verified | Real |
| approval_gates_count | **4** | Verified | Real |
| fee_schedule_online | null | TBD (PCI determines) | Default false |
| All others | null | | |

**Real data:** 2 of 17 metrics (12%). **Transparency:** 0/5 → grade F (all null → false).

---

## 3. Potential Formula Issues

### 3.1 Millage Rate Scaling

**Current formula:** `n1 = Math.min((millage ?? 35) * 2, 100)`

- Holland: 31.98 × 2 = 63.96 → fiscal component ~32
- Default 35 × 2 = 70 → fiscal component ~35

**Issue:** The methodology says "millage rate vs county median." We use raw total mills. Ottawa County townships typically range ~30–50 mills. The formula treats 50 mills = 100 (max burden). Holland at 32 mills may be on the lower end; the score of ~32 may understate relative burden if county median is lower.

**Recommendation:** Calibrate against Ottawa County median millage, or document that we use absolute scale.

### 3.2 Regulatory Intensity — permit_cost_burden

**Current:** Default 50 when null. This is 20% of the regulatory score.

**Issue:** We have fee data (Olive: electrical $285, mechanical $190, plumbing $190; Ottawa County: septic $535, well $445). We could compute a normalized permit cost (e.g., sum for typical SFH, scale 0–100 vs county) and populate `permit_cost_burden`. Currently it's always default.

### 3.3 Predictability — 100% Defaults

All four predictability inputs are null for every municipality. The score is always the same (~58) regardless of jurisdiction. This is the most misleading: users see a "Development Predictability" score that does not reflect any real differences.

---

## 4. What Was Not Gathered (Inaccurate or Missing)

| Category | Metrics | Source | Effort |
|----------|---------|--------|--------|
| **Predictability** | variance_approval_rate_5yr, rezoning_approval_rate, zoning_amendments_10yr, zoning_litigation_10yr | Planning minutes, ordinance history, court records | 4–8 hrs/jurisdiction |
| **Regulatory** | avg_permit_processing_days, required_inspections_count, permit_cost_burden | Building dept, FOIA, fee schedule sums | 2–3 hrs/jurisdiction |
| **Fiscal** | millage_rate (Olive, Georgetown), special_assessments_present, debt_per_capita | County equalization, budget, CAFR | 1–2 hrs/jurisdiction |
| **Transparency** | zoning_map_online, minutes_searchable, clear_checklists | Web audit | ~30 min/jurisdiction |

---

## 5. Recommendations

### Short-term (improve accuracy with existing data)

1. **Compute permit_cost_burden** from FeeItem totals for jurisdictions with fee data (Olive, Ottawa County). Normalize to 0–100.
2. **Add millage for Olive and Georgetown** from Ottawa County equalization (public).
3. **Audit transparency booleans** — zoning_map_online, minutes_searchable, clear_checklists — via quick web checks.
4. **Show "data quality" indicator** — e.g., "Score based on 6/17 metrics; remainder use defaults." Reduces user trust in sparse scores.

### Medium-term (scoring logic)

5. **Reduce or eliminate defaults** — When >50% of a score's inputs are null, consider showing "Insufficient data" instead of a default-derived score.
6. **Weight by data availability** — Down-weight components that use defaults, or cap the score contribution from defaulted metrics.

### Long-term (data collection)

7. **Prioritize predictability research** — Variance/rezoning rates from planning minutes; zoning amendments from ordinance history.
8. **FOIA permit processing times** — avg_permit_processing_days is high-impact and often obtainable.

---

## 6. Summary

| Score | Holland | Olive | Georgetown | Why Similar? |
|-------|---------|-------|------------|--------------|
| Regulatory | ~49 | ~49 | ~52 | Same defaults; Georgetown has 7 permits, 4 gates (slightly higher) |
| Predictability | ~58 | ~58 | ~58 | 100% defaults for all |
| Fiscal | ~32 | ~35 | ~35 | Holland has real millage (32); others use default 35 |
| Transparency | D | D | F | Holland/Olive: 2/5; Georgetown: 0/5 (all null) |

**Bottom line:** Snapshot ratings are inaccurate because most inputs are null and replaced with uniform defaults. Transparency is the only score that meaningfully differs across municipalities, since we have real boolean data for 2–3 of 5 criteria.
